import SwiftUI

struct SignaturePreviewView: View {
    let strokeData: StrokeDataDTO

    private var inkColor: Color {
        Color(hex: strokeData.settings.inkColor ?? "#1d1c16") ?? DesignTokens.onSurface
    }

    var body: some View {
        Canvas { context, size in
            let scaleX = size.width / CGFloat(strokeData.width)
            let scaleY = size.height / CGFloat(strokeData.height)
            let scale = min(scaleX, scaleY)

            for stroke in strokeData.strokes.sorted(by: { $0.order < $1.order }) {
                guard stroke.points.count >= 2 else { continue }
                var path = Path()
                let first = stroke.points[0]
                path.move(to: CGPoint(x: first.x * scale, y: first.y * scale))
                for point in stroke.points.dropFirst() {
                    path.addLine(to: CGPoint(x: point.x * scale, y: point.y * scale))
                }
                context.stroke(
                    path,
                    with: .color(inkColor),
                    style: StrokeStyle(lineWidth: max(1.5, 2 * scale), lineCap: .round, lineJoin: .round)
                )
            }
        }
        .background(DesignTokens.surfaceContainerLow)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

extension Color {
    init?(hex: String) {
        var hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        if hex.count == 6 { hex = "FF" + hex }
        guard hex.count == 8, let value = UInt64(hex, radix: 16) else { return nil }
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}

@MainActor
enum SignatureImageRenderer {
    static func pngBase64(from strokeData: StrokeDataDTO, width: CGFloat = 400) -> String? {
        let aspect = strokeData.height / strokeData.width
        let height = width * aspect
        let view = SignaturePreviewView(strokeData: strokeData)
            .frame(width: width, height: height)

        let renderer = ImageRenderer(content: view)
        renderer.scale = 2
        guard let uiImage = renderer.uiImage,
              let data = uiImage.pngData() else { return nil }
        return data.base64EncodedString()
    }
}
