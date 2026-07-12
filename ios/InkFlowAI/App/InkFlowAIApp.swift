import SwiftUI

@main
struct InkFlowAIApp: App {
    @State private var auth = AuthStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .tint(DesignTokens.tertiary)
        }
    }
}
