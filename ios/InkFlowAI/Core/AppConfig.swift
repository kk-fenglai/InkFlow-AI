import Foundation

enum AppConfig {
    /// Production API. Override in scheme env `INKFLOW_API_BASE` for local dev.
    static var apiBaseURL: URL {
        if let override = ProcessInfo.processInfo.environment["INKFLOW_API_BASE"],
           let url = URL(string: override) {
            return url
        }
        return URL(string: "https://signaturegeneratorai.vercel.app")!
    }
}
