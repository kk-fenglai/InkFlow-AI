import SwiftUI

struct LoginView: View {
    @Environment(AuthStore.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @State private var showRegister = false
    @State private var showForgotPassword = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 8) {
                        Text("InkFlow AI")
                            .font(.custom("Georgia", size: 32))
                            .foregroundStyle(DesignTokens.onSurface)
                        Text("Artisan signature studio")
                            .font(.subheadline)
                            .foregroundStyle(DesignTokens.onSurfaceVariant)
                    }
                    .padding(.top, 40)

                    VStack(spacing: 16) {
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .padding()
                            .background(DesignTokens.surfaceContainerLow)
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        SecureField("Password", text: $password)
                            .textContentType(.password)
                            .padding()
                            .background(DesignTokens.surfaceContainerLow)
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        if let err = auth.errorMessage {
                            Text(err)
                                .font(.footnote)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                        }

                        Button {
                            Task { await auth.login(email: email, password: password) }
                        } label: {
                            Group {
                                if auth.isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Sign in")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(DesignTokens.onSurface)
                            .foregroundStyle(DesignTokens.background)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                        .disabled(email.isEmpty || password.isEmpty || auth.isLoading)
                    }
                    .inkCard()

                    Button("Create account") { showRegister = true }
                        .foregroundStyle(DesignTokens.tertiary)

                    Button("Forgot password?") { showForgotPassword = true }
                        .font(.footnote)
                        .foregroundStyle(DesignTokens.onSurfaceVariant)
                }
                .padding()
            }
            .background(DesignTokens.background)
            .navigationDestination(isPresented: $showRegister) {
                RegisterView()
            }
            .navigationDestination(isPresented: $showForgotPassword) {
                ForgotPasswordView()
            }
        }
    }
}
