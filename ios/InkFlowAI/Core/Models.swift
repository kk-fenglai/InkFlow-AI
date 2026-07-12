import Foundation

struct APIError: LocalizedError {
    let message: String
    let code: String?
    var errorDescription: String? { message }
}

struct UserDTO: Codable, Equatable {
    let id: String
    let email: String?
    let name: String?
    let credits: Int
    let plan: String
    let role: String
}

struct AuthResponse: Codable {
    let ok: Bool
    let accessToken: String?
    let refreshToken: String?
    let expiresIn: Int?
    let user: UserDTO?
    let error: String?
    let code: String?
}

struct MeResponse: Codable {
    let ok: Bool
    let user: UserDTO?
    let error: String?
    let code: String?
}

struct OkResponse: Codable {
    let ok: Bool?
    let error: String?
    let message: String?
}

struct CreditsResponse: Codable {
    let credits: Int?
    let plan: String?
    let error: String?
}

struct AppleProductDTO: Codable, Identifiable {
    var id: String { productId }
    let productId: String
    let kind: String
    let packId: String
    let credits: Int
    let amountCents: Int
    let currency: String
}

struct AppleProductsResponse: Codable {
    let ok: Bool?
    let products: [AppleProductDTO]?
    let error: String?
}

struct VerifyTransactionResponse: Codable {
    let ok: Bool
    let purchaseId: String?
    let creditsGranted: Int?
    let credits: Int?
    let plan: String?
    let reason: String?
    let message: String?
}

struct StrokePointDTO: Codable {
    let x: Double
    let y: Double
}

struct SignatureStrokeDTO: Codable {
    let id: String
    let order: Int
    let label: String
    let points: [StrokePointDTO]
}

struct SignatureSettingsDTO: Codable {
    let text: String?
    let baseId: String?
    let fluidity: Double?
    let rhythm: Double?
    let pressure: Double?
    let slant: Double?
    let size: Double?
    let inkColor: String?
    let backgroundImage: String?
    let backgroundOpacity: Double?
    let backgroundFit: String?
    let enhanced: Bool?
    let aiNote: String?
}

struct StrokeDataDTO: Codable {
    let version: Int
    let width: Double
    let height: Double
    let text: String
    let baseId: String
    let strokes: [SignatureStrokeDTO]
    let settings: SignatureSettingsDTO
    let createdAt: String?
}

struct GenerateResponse: Codable {
    let ok: Bool?
    let creditsRemaining: Int?
    let settings: SignatureSettingsDTO?
    let strokeData: StrokeDataDTO?
    let error: String?
    let code: String?
}

struct SavedSignatureDTO: Codable, Identifiable {
    let id: String
    let name: String
    let strokeData: StrokeDataDTO
    let savedAt: String
    let source: String?
}

struct SignaturesListResponse: Codable {
    let ok: Bool?
    let signatures: [SavedSignatureDTO]?
    let error: String?
}

struct SaveSignatureResponse: Codable {
    let ok: Bool?
    let signature: SavedSignatureDTO?
    let creditsRemaining: Int?
    let charged: Bool?
    let error: String?
    let code: String?
}

struct RefineAnalysisDTO: Codable {
    let threshold: Int?
    let smoothing: Int?
    let inkColor: String?
    let refineStrength: Int?
    let aiNote: String?
}

struct RefineResponse: Codable {
    let ok: Bool?
    let analysis: RefineAnalysisDTO?
    let exportAuthorized: Bool?
    let error: String?
}

struct SignPDFResponse: Codable {
    let ok: Bool?
    let pdfBase64: String?
    let fileName: String?
    let creditsRemaining: Int?
    let error: String?
    let code: String?
}
