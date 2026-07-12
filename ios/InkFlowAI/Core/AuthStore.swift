import Foundation
import Observation

@Observable
@MainActor
final class AuthStore {
    var user: UserDTO?
    var isLoading = false
    var errorMessage: String?

    var isAuthenticated: Bool { user != nil }

    init() {
        Task { await restoreSession() }
    }

    func restoreSession() async {
        guard KeychainHelper.load(account: "accessToken") != nil else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            user = try await APIClient.shared.fetchMe()
        } catch {
            user = nil
            await APIClient.shared.clearTokens()
        }
    }

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let res = try await APIClient.shared.login(email: email, password: password)
            try await applyAuth(res)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func register(email: String, password: String, name: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let res = try await APIClient.shared.register(
                email: email,
                password: password,
                name: name.isEmpty ? nil : name
            )
            try await applyAuth(res)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() async {
        await APIClient.shared.logout()
        user = nil
    }

    func refreshUser() async {
        guard isAuthenticated else { return }
        do {
            user = try await APIClient.shared.fetchMe()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func applyAuth(_ res: AuthResponse) async throws {
        guard res.ok,
              let access = res.accessToken,
              let refresh = res.refreshToken,
              let user = res.user else {
            throw APIError(message: res.error ?? "Authentication failed", code: res.code)
        }
        await APIClient.shared.setTokens(access: access, refresh: refresh)
        self.user = user
    }
}
