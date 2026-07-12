import SwiftUI

enum DesignTokens {
    static let background = Color(red: 254 / 255, green: 249 / 255, blue: 239 / 255)
    static let onSurface = Color(red: 29 / 255, green: 28 / 255, blue: 22 / 255)
    static let onSurfaceVariant = Color(red: 69 / 255, green: 71 / 255, blue: 66 / 255)
    static let tertiary = Color(red: 119 / 255, green: 90 / 255, blue: 25 / 255)
    static let surfaceContainerLow = Color(red: 248 / 255, green: 243 / 255, blue: 234 / 255)
    static let outlineVariant = Color(red: 198 / 255, green: 199 / 255, blue: 192 / 255)
}

struct InkCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(DesignTokens.surfaceContainerLow)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(DesignTokens.outlineVariant.opacity(0.4), lineWidth: 1)
            )
    }
}

extension View {
    func inkCard() -> some View { modifier(InkCard()) }
}
