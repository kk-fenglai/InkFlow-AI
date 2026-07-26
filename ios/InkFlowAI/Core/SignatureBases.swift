import Foundation

enum SignatureBases {
    struct Base: Identifiable {
        let id: String
        let name: String
        let tier: String
        let fluidity: Double
        let rhythm: Double
        let pressure: Double
        let slant: Double
        let size: Double
    }

    /// Free templates available without unlock (matches web free tier).
    static let free: [Base] = [
        Base(id: "poet", name: "The Poet", tier: "free", fluidity: 85, rhythm: 60, pressure: 55, slant: 8, size: 1),
        Base(id: "classic", name: "The Classic", tier: "free", fluidity: 65, rhythm: 70, pressure: 30, slant: 4, size: 1.1),
        Base(id: "architect", name: "The Architect", tier: "free", fluidity: 45, rhythm: 90, pressure: 35, slant: 2, size: 1.35),
        Base(id: "executive", name: "The Executive", tier: "free", fluidity: 70, rhythm: 75, pressure: 80, slant: 10, size: 0.95),
        Base(id: "scribe", name: "The Scribe", tier: "free", fluidity: 55, rhythm: 82, pressure: 40, slant: 5, size: 1.05),
        Base(id: "signer", name: "The Signer", tier: "free", fluidity: 72, rhythm: 65, pressure: 45, slant: 6, size: 1.08),
        Base(id: "minimal", name: "The Minimalist", tier: "free", fluidity: 50, rhythm: 88, pressure: 28, slant: 2, size: 1.15),
        Base(id: "formal", name: "The Formalist", tier: "free", fluidity: 58, rhythm: 78, pressure: 38, slant: 3, size: 1.2),
        Base(id: "clerk", name: "The Clerk", tier: "free", fluidity: 48, rhythm: 80, pressure: 32, slant: 1, size: 1.1),
        Base(id: "draft", name: "The Drafter", tier: "free", fluidity: 62, rhythm: 58, pressure: 36, slant: 5, size: 1.05),
    ]
}
