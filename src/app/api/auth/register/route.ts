import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

import { FREE_STARTER_CREDITS } from "@/lib/constants";

import { normalizeEmail, validatePassword } from "@/lib/auth/password";



export async function POST(req: Request) {

  let body: { email?: string; password?: string; name?: string };

  try {

    body = await req.json();

  } catch {

    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  }



  const email = normalizeEmail(body.email ?? "");

  const password = body.password ?? "";

  const name = body.name?.trim() || email?.split("@")[0] || "Artist";



  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

    return NextResponse.json({ error: "Valid email required." }, { status: 400 });

  }



  const pwdError = validatePassword(password);

  if (pwdError) {

    return NextResponse.json({ error: pwdError }, { status: 400 });

  }



  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {

    return NextResponse.json(

      { error: "An account with this email already exists." },

      { status: 409 },

    );

  }



  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({

    data: {

      email,

      passwordHash,

      name,

      credits: FREE_STARTER_CREDITS,

      emailVerifiedAt: new Date(),

    },

  });



  await prisma.creditTransaction.create({

    data: {

      userId: user.id,

      amount: FREE_STARTER_CREDITS,

      reason: "welcome_bonus",

    },

  });



  return NextResponse.json({

    ok: true,

    email: user.email,

    message: "Account created. You can sign in now.",

  });

}

