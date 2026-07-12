import SwiftUI
import StoreKit

struct PricingView: View {
    @Bindable var store: StoreManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if store.isLoading && store.products.isEmpty {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                }

                Section("Credit packs") {
                    ForEach(store.products.filter { $0.type == .consumable }) { product in
                        Button {
                            Task { await store.purchase(product) }
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(product.displayName)
                                    Text(product.description)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(product.displayPrice)
                                    .fontWeight(.semibold)
                            }
                        }
                    }
                }

                Section("Subscription") {
                    ForEach(store.products.filter { $0.type == .autoRenewable }) { product in
                        Button {
                            Task { await store.purchase(product) }
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(product.displayName)
                                    Text(product.description)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(product.displayPrice)
                                    .fontWeight(.semibold)
                            }
                        }
                    }
                }

                if let msg = store.lastPurchaseMessage {
                    Section {
                        Text(msg).foregroundStyle(DesignTokens.tertiary)
                    }
                }
                if let err = store.errorMessage {
                    Section {
                        Text(err).foregroundStyle(.red)
                    }
                }

                Section {
                    Button("Restore purchases") {
                        Task { await store.restorePurchases() }
                    }
                }
            }
            .navigationTitle("Pricing")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task { await store.loadProducts() }
        }
    }
}
