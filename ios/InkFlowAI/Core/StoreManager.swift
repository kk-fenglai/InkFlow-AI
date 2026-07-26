import StoreKit

@MainActor
@Observable
final class StoreManager {
    var products: [Product] = []
    var isLoading = false
    var errorMessage: String?
    var lastPurchaseMessage: String?

    private let productIds: Set<String> = [
        "com.inkflow.ai.credits.20",
        "com.inkflow.ai.credits.50",
        "com.inkflow.ai.credits.120",
        "com.inkflow.ai.pro.monthly",
    ]

    func loadProducts() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            products = try await Product.products(for: productIds)
                .sorted { $0.price < $1.price }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func purchase(_ product: Product) async {
        isLoading = true
        errorMessage = nil
        lastPurchaseMessage = nil
        defer { isLoading = false }
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                try await fulfill(transaction)
                await transaction.finish()
            case .userCancelled:
                break
            case .pending:
                lastPurchaseMessage = "Purchase pending approval"
            @unknown default:
                break
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func restorePurchases() async {
        isLoading = true
        errorMessage = nil
        lastPurchaseMessage = nil
        defer { isLoading = false }

        do {
            try await AppStore.sync()
            var restored = 0
            for await result in Transaction.currentEntitlements {
                guard case .verified(let transaction) = result else { continue }
                if transaction.revocationDate != nil { continue }
                let ok = try await fulfill(transaction)
                if ok { restored += 1 }
            }
            lastPurchaseMessage = restored > 0
                ? "Restored \(restored) purchase(s)"
                : "No active subscriptions to restore"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @discardableResult
    private func fulfill(_ transaction: Transaction) async throws -> Bool {
        let res = try await APIClient.shared.verifyAppleTransaction(
            transactionId: String(transaction.id),
            productId: transaction.productID
        )
        if res.ok {
            if let granted = res.creditsGranted, granted > 0 {
                lastPurchaseMessage = "+\(granted) credits"
            } else {
                lastPurchaseMessage = "Purchase applied"
            }
            return true
        }
        if res.reason == "already_completed" {
            return false
        }
        errorMessage = res.message ?? res.reason ?? "Purchase failed"
        return false
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw APIError(message: "Transaction unverified", code: "UNVERIFIED")
        case .verified(let safe):
            return safe
        }
    }
}
