import SwiftUI

struct RegisterView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Create Studio Account")
                    .font(.title2)
                    .foregroundStyle(DesignTokens.onSurface)

                TextField("Display name", text: $name)
                    .padding()
                    .background(DesignTokens.surfaceContainerLow)
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .padding()
                    .background(DesignTokens.surfaceContainerLow)
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                SecureField("Password (8+ characters)", text: $password)
                    .textContentType(.newPassword)
                    .padding()
                    .background(DesignTokens.surfaceContainerLow)
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                if let err = auth.errorMessage {
                    Text(err).font(.footnote).foregroundStyle(.red)
                }

                Button {
                    Task {
                        await auth.register(email: email, password: password, name: name)
                        if auth.isAuthenticated { dismiss() }
                    }
                } label: {
                    Text("Register")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(DesignTokens.tertiary)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(email.isEmpty || password.count < 8 || auth.isLoading)
            }
            .padding()
        }
        .background(DesignTokens.background)
        .navigationBarTitleDisplayMode(.inline)
    }
}
