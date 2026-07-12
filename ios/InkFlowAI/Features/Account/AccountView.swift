import SwiftUI

struct AccountView: View {
    @Environment(AuthStore.self) private var auth
    @State private var store = StoreManager()
    @State private var showPricing = false
    @State private var showDeleteConfirm = false
    @State private var isDeleting = false
    @State private var deleteError: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let user = auth.user {
                        VStack(spacing: 8) {
                            Circle()
                                .fill(DesignTokens.tertiary.opacity(0.15))
                                .frame(width: 72, height: 72)
                                .overlay {
                                    Text(String((user.name ?? user.email ?? "?").prefix(1)).uppercased())
                                        .font(.title)
                                        .foregroundStyle(DesignTokens.tertiary)
                                }

                            Text(user.name ?? "Studio Artist")
                                .font(.title3)
                                .foregroundStyle(DesignTokens.onSurface)
                            Text(user.email ?? "")
                                .font(.footnote)
                                .foregroundStyle(DesignTokens.onSurfaceVariant)

                            HStack(spacing: 12) {
                                Label("\(user.credits) credits", systemImage: "circle.circle")
                                Text(user.plan.uppercased())
                                    .font(.caption.weight(.semibold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(DesignTokens.tertiary.opacity(0.12))
                                    .clipShape(Capsule())
                            }
                            .font(.subheadline)
                            .foregroundStyle(DesignTokens.onSurfaceVariant)
                        }
                        .frame(maxWidth: .infinity)
                        .inkCard()
                    }

                    Button {
                        showPricing = true
                    } label: {
                        Label("Buy credits & Pro", systemImage: "cart")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(DesignTokens.tertiary)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    Link("Privacy policy", destination: URL(string: "https://signaturegeneratorai.vercel.app/privacy")!)
                        .font(.footnote)

                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        HStack {
                            if isDeleting { ProgressView() }
                            Text("Delete account")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                    }
                    .buttonStyle(.bordered)
                    .disabled(isDeleting)

                    Button(role: .destructive) {
                        Task { await auth.logout() }
                    } label: {
                        Text("Sign out")
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                    .buttonStyle(.bordered)

                    if let deleteError {
                        Text(deleteError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
                .padding()
            }
            .background(DesignTokens.background)
            .navigationTitle("Account")
            .sheet(isPresented: $showPricing) {
                PricingView(store: store)
                    .onDisappear { Task { await auth.refreshUser() } }
            }
            .confirmationDialog(
                "Delete your account permanently? This cannot be undone.",
                isPresented: $showDeleteConfirm,
                titleVisibility: .visible
            ) {
                Button("Delete account", role: .destructive) {
                    Task { await deleteAccount() }
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    private func deleteAccount() async {
        isDeleting = true
        deleteError = nil
        defer { isDeleting = false }
        do {
            try await APIClient.shared.deleteAccount()
            auth.user = nil
        } catch {
            deleteError = error.localizedDescription
        }
    }
}
