import type Stripe from "stripe";
import { CREDIT_PACK_CURRENCY, SUBSCRIPTION_PLAN } from "@/lib/constants";
import { applySubscriptionPeriod } from "@/lib/billing/subscription";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const MAX_RENEWAL_FAILURES = 3;

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const fromParent = invoice.parent?.subscription_details?.subscription;
  if (typeof fromParent === "string") return fromParent;
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) {
    return fromParent.id;
  }
  const legacy = (invoice as { subscription?: string | { id: string } | null })
    .subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) return legacy.id;
  return null;
}

function invoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  const payments = invoice.payments?.data;
  if (payments?.length) {
    for (const row of payments) {
      const pi = row.payment?.payment_intent;
      if (typeof pi === "string") return pi;
      if (pi && typeof pi === "object" && "id" in pi) return pi.id;
    }
  }
  const legacy = (invoice as { payment_intent?: string | { id: string } | null })
    .payment_intent;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) return legacy.id;
  return null;
}

async function resolveInvoicePaymentIntentId(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const direct = invoicePaymentIntentId(invoice);
  if (direct) return direct;

  const stripe = getStripe();
  if (!stripe || !invoice.id) return null;

  const full = await stripe.invoices.retrieve(invoice.id, {
    expand: ["payments.data.payment.payment_intent"],
  });
  return invoicePaymentIntentId(full);
}

/**
 * Stripe does not guarantee event order, so invoice.paid can arrive before the
 * checkout.session.completed that normally creates the contract. Rebuild it
 * from the subscription's metadata rather than dropping a paid invoice.
 */
async function ensureContractForSubscription(subscriptionId: string) {
  const existing = await prisma.payContract.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (existing) return existing;

  const stripe = getStripe();
  if (!stripe) return null;

  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }

  const userId = subscription.metadata?.userId;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return null;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  try {
    return await prisma.payContract.create({
      data: {
        userId: user.id,
        planCode: subscription.metadata?.planCode || SUBSCRIPTION_PLAN.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: "active",
      },
    });
  } catch (e) {
    // The checkout handler may have won the race in the meantime.
    if ((e as { code?: string }).code === "P2002") {
      return prisma.payContract.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
      });
    }
    throw e;
  }
}

export async function handleSubscriptionCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const purchaseId =
    session.metadata?.purchaseId || session.client_reference_id || null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!purchaseId || !subscriptionId || !customerId) return;

  const purchase = await prisma.creditPurchase.findUnique({
    where: { id: String(purchaseId) },
  });
  if (!purchase || purchase.purchaseType !== "subscription") return;

  await prisma.user.updateMany({
    where: { id: purchase.userId },
    data: { stripeCustomerId: customerId },
  });

  const existing = await prisma.payContract.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  let contractId = existing?.id;

  if (!existing) {
    const created = await prisma.payContract.create({
      data: {
        userId: purchase.userId,
        planCode: SUBSCRIPTION_PLAN.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: "active",
      },
    });
    contractId = created.id;
  }

  await prisma.creditPurchase.updateMany({
    where: { id: purchase.id },
    data: {
      contractId,
      status: "completed",
      paidAt: new Date(),
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
    },
  });
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.id) return;

  const subscriptionId = invoiceSubscriptionId(invoice);

  if (!subscriptionId) return;

  const contract = await ensureContractForSubscription(subscriptionId);

  if (!contract) return;

  const amountPaid =
    typeof invoice.amount_paid === "number"
      ? invoice.amount_paid
      : Math.round(SUBSCRIPTION_PLAN.priceEur * 100);

  const paymentIntentId = await resolveInvoicePaymentIntentId(invoice);

  const sessionKey = `inv_${invoice.id}`;

  let order = await prisma.creditPurchase.findUnique({
    where: { stripeSessionId: sessionKey },
  });

  if (!order) {
    try {
      order = await prisma.creditPurchase.create({
        data: {
          userId: contract.userId,
          stripeSessionId: sessionKey,
          stripePaymentIntentId: paymentIntentId ?? null,
          packId: SUBSCRIPTION_PLAN.id,
          purchaseType: "subscription",
          credits: SUBSCRIPTION_PLAN.creditsPerMonth,
          amountCents: amountPaid,
          currency: invoice.currency ?? CREDIT_PACK_CURRENCY,
          status: "completed",
          paidAt: new Date(),
          contractId: contract.id,
        },
      });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      order = await prisma.creditPurchase.findUnique({
        where: { stripeSessionId: sessionKey },
      });
    }
  }

  if (!order) return;

  // The order row existing is not proof the period was granted — an earlier
  // delivery could have died between the two. Gate on the grant itself so a
  // Stripe retry finishes the job instead of reporting success.
  const alreadyGranted = await prisma.subscriptionRecord.findFirst({
    where: { sourcePurchaseId: order.id },
    select: { id: true },
  });
  if (alreadyGranted) return;

  await applySubscriptionPeriod({
    userId: contract.userId,
    sourcePurchaseId: order.id,
    contractId: contract.id,
  });
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const contract = await prisma.payContract.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!contract) return;

  const failedCount = contract.failedCount + 1;
  await prisma.payContract.update({
    where: { id: contract.id },
    data: {
      failedCount,
      status: failedCount >= MAX_RENEWAL_FAILURES ? "suspended" : contract.status,
    },
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  if (!subscription.id) return;

  await prisma.payContract.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: "terminated" },
  });
}
