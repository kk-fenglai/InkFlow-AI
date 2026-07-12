import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            StudioView()
                .tabItem { Label("Studio", systemImage: "pencil.and.outline") }

            LibraryView()
                .tabItem { Label("Library", systemImage: "books.vertical") }

            RefineView()
                .tabItem { Label("Refine", systemImage: "wand.and.stars") }

            SignPDFView()
                .tabItem { Label("Sign PDF", systemImage: "doc.append") }

            AccountView()
                .tabItem { Label("Account", systemImage: "person.circle") }
        }
        .tint(DesignTokens.tertiary)
    }
}
