import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var isSending = false
    @State private var message: String?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("Enter your account email. If it exists, we will send a reset link.")
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.onSurfaceVariant)
                    .multilineTextAlignment(.center)

                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .padding()
                    .background(DesignTokens.surfaceContainerLow)
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                Button {
                    Task { await sendReset() }
                } label: {
                    HStack {
                        if isSending { ProgressView().tint(.white) }
                        Text("Send reset link")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(DesignTokens.onSurface)
                    .foregroundStyle(DesignTokens.background)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(email.isEmpty || isSending)

                if let message {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(DesignTokens.tertiary)
                        .multilineTextAlignment(.center)
                }
                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
            }
            .padding()
        }
        .background(DesignTokens.background)
        .navigationTitle("Forgot password")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func sendReset() async {
        isSending = true
        message = nil
        errorMessage = nil
        defer { isSending = false }
        do {
            try await APIClient.shared.requestPasswordReset(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            message = "If an account exists for this email, a reset link has been sent."
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
