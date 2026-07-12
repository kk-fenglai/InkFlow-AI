import Foundation

actor APIClient {
    static let shared = APIClient()

    private var accessToken: String? {
        KeychainHelper.load(account: "accessToken")
    }

    private var refreshToken: String? {
        KeychainHelper.load(account: "refreshToken")
    }

    func setTokens(access: String, refresh: String) {
        KeychainHelper.save(access, account: "accessToken")
        KeychainHelper.save(refresh, account: "refreshToken")
    }

    func clearTokens() {
        KeychainHelper.clearAuth()
    }

    // MARK: - Auth

    func login(email: String, password: String) async throws -> AuthResponse {
        try await post("/api/mobile/login", body: ["email": email, "password": password], auth: false)
    }

    func register(email: String, password: String, name: String?) async throws -> AuthResponse {
        var body: [String: String] = ["email": email, "password": password]
        if let name, !name.isEmpty { body["name"] = name }
        return try await post("/api/mobile/register", body: body, auth: false)
    }

    func refreshSession() async throws -> AuthResponse {
        guard let refresh = refreshToken else {
            throw APIError(message: "No refresh token", code: "NO_REFRESH")
        }
        return try await post(
            "/api/mobile/refresh",
            body: ["refreshToken": refresh],
            auth: false
        )
    }

    func logout() async {
        if let refresh = refreshToken {
            _ = try? await post(
                "/api/mobile/logout",
                body: ["refreshToken": refresh],
                auth: false
            ) as AuthResponse
        }
        clearTokens()
    }

    func fetchMe() async throws -> UserDTO {
        let res: MeResponse = try await get("/api/mobile/me")
        guard let user = res.user else {
            throw APIError(message: res.error ?? "Unauthorized", code: res.code)
        }
        return user
    }

    func fetchCredits() async throws -> CreditsResponse {
        try await get("/api/credits")
    }

    func fetchAppleProducts() async throws -> [AppleProductDTO] {
        let res: AppleProductsResponse = try await get("/api/apple/products")
        return res.products ?? []
    }

    func verifyAppleTransaction(
        transactionId: String,
        productId: String,
        signedTransaction: String? = nil
    ) async throws -> VerifyTransactionResponse {
        var body: [String: Any] = [
            "transactionId": transactionId,
            "productId": productId,
        ]
        if let signedTransaction {
            body["signedTransaction"] = signedTransaction
        }
        return try await post("/api/apple/verify-transaction", body: body)
    }

    func generateFinalInk(text: String, baseId: String = "poet") async throws -> GenerateResponse {
        try await post(
            "/api/generate",
            body: [
                "text": text,
                "baseId": baseId,
                "fluidity": 50,
                "rhythm": 50,
                "pressure": 50,
            ]
        )
    }

    func fetchSignatures() async throws -> [SavedSignatureDTO] {
        let res: SignaturesListResponse = try await get("/api/signatures")
        return res.signatures ?? []
    }

    func saveSignature(name: String, strokeData: StrokeDataDTO) async throws -> SaveSignatureResponse {
        let encoder = JSONEncoder()
        let strokeJSON = try JSONSerialization.jsonObject(with: encoder.encode(strokeData))
        return try await post(
            "/api/signatures",
            body: [
                "name": name,
                "strokeData": strokeJSON,
            ]
        )
    }

    func renameSignature(id: String, name: String) async throws {
        let _: OkResponse = try await patch(
            "/api/signatures/\(id)",
            body: ["name": name]
        )
    }

    func deleteSignature(id: String) async throws {
        let _: OkResponse = try await delete("/api/signatures/\(id)")
    }

    func analyzeRefine(imageBase64: String) async throws -> RefineResponse {
        try await post(
            "/api/refine",
            body: ["imageBase64": imageBase64]
        )
    }

    func signPDF(
        pdfBase64: String,
        signaturePngBase64: String,
        pageIndex: Int,
        x: Double,
        y: Double,
        width: Double,
        height: Double,
        fileName: String
    ) async throws -> SignPDFResponse {
        try await post(
            "/api/sign/pdf",
            body: [
                "pdfBase64": pdfBase64,
                "signaturePngBase64": signaturePngBase64,
                "pageIndex": pageIndex,
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "fileName": fileName,
                "sesAccepted": true,
            ]
        )
    }

    func deleteAccount() async throws {
        let _: OkResponse = try await delete("/api/account")
        clearTokens()
    }

    func requestPasswordReset(email: String) async throws {
        let _: OkResponse = try await post(
            "/api/auth/forgot-password",
            body: ["email": email],
            auth: false
        )
    }

    // MARK: - HTTP

    private func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(path: path, method: "GET", body: nil as [String: String]?, retryOn401: true)
    }

    private func post<T: Decodable, B: Encodable>(
        _ path: String,
        body: B,
        auth: Bool = true
    ) async throws -> T {
        try await request(path: path, method: "POST", body: body, retryOn401: auth)
    }

    func post<T: Decodable>(
        _ path: String,
        body: [String: Any],
        auth: Bool = true
    ) async throws -> T {
        try await requestJSON(path: path, method: "POST", jsonBody: body, retryOn401: auth)
    }

    func patch<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        try await requestJSON(path: path, method: "PATCH", jsonBody: body, retryOn401: true)
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        try await requestJSON(path: path, method: "DELETE", jsonBody: nil, retryOn401: true)
    }

    private func request<T: Decodable, B: Encodable>(
        path: String,
        method: String,
        body: B?,
        retryOn401: Bool
    ) async throws -> T {
        if let body {
            let data = try JSONEncoder().encode(body)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
            return try await requestJSON(path: path, method: method, jsonBody: json, retryOn401: retryOn401)
        }
        return try await requestJSON(path: path, method: method, jsonBody: nil, retryOn401: retryOn401)
    }

    private func requestJSON<T: Decodable>(
        path: String,
        method: String,
        jsonBody: [String: Any]?,
        retryOn401: Bool,
        isRetry: Bool = false
    ) async throws -> T {
        var url = AppConfig.apiBaseURL
        url.append(path: path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = accessToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let jsonBody {
            req.httpBody = try JSONSerialization.data(withJSONObject: jsonBody)
        }

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(message: "Invalid response", code: nil)
        }

        if http.statusCode == 401, retryOn401, !isRetry {
            let refreshed = try await refreshSession()
            if refreshed.ok, let access = refreshed.accessToken, let refresh = refreshed.refreshToken {
                setTokens(access: access, refresh: refresh)
                return try await requestJSON(
                    path: path,
                    method: method,
                    jsonBody: jsonBody,
                    retryOn401: false,
                    isRetry: true
                )
            }
        }

        if http.statusCode >= 400 {
            if let err = try? JSONDecoder().decode(AuthResponse.self, from: data) {
                throw APIError(message: err.error ?? "Request failed", code: err.code)
            }
            throw APIError(message: "HTTP \(http.statusCode)", code: nil)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }
}
