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
                let res = try await APIClient.shared.verifyAppleTransaction(
                    transactionId: String(transaction.id),
                    productId: transaction.productID
                )
                if res.ok {
                    lastPurchaseMessage = "+\(res.creditsGranted ?? 0) credits"
                } else {
                    errorMessage = res.message ?? res.reason ?? "Purchase failed"
                }
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
        try? await AppStore.sync()
        lastPurchaseMessage = "Restored App Store purchases"
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
