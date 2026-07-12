import PhotosUI
import SwiftUI

struct RefineView: View {
    @State private var pickerItem: PhotosPickerItem?
    @State private var previewImage: UIImage?
    @State private var analysis: RefineAnalysisDTO?
    @State private var isAnalyzing = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Upload a photo of handwriting or a scanned signature. Analysis is free.")
                        .font(.subheadline)
                        .foregroundStyle(DesignTokens.onSurfaceVariant)

                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        Label("Choose photo", systemImage: "photo.on.rectangle")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(DesignTokens.surfaceContainerLow)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .onChange(of: pickerItem) { _, item in
                        Task { await loadImage(from: item) }
                    }

                    if let previewImage {
                        Image(uiImage: previewImage)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 220)
                            .clipShape(RoundedRectangle(cornerRadius: 8))

                        Button {
                            Task { await analyze(image: previewImage) }
                        } label: {
                            HStack {
                                if isAnalyzing { ProgressView().tint(.white) }
                                Text("Analyze ink")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(DesignTokens.onSurface)
                            .foregroundStyle(DesignTokens.background)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                        .disabled(isAnalyzing)
                    }

                    if let analysis {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Suggested parameters")
                                .font(.headline)
                            if let threshold = analysis.threshold {
                                Text("Threshold: \(threshold)")
                            }
                            if let smoothing = analysis.smoothing {
                                Text("Smoothing: \(smoothing)")
                            }
                            if let strength = analysis.refineStrength {
                                Text("Refine strength: \(strength)")
                            }
                            if let note = analysis.aiNote {
                                Text(note)
                                    .font(.footnote)
                                    .foregroundStyle(DesignTokens.tertiary)
                            }
                        }
                        .inkCard()
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
                .padding()
            }
            .background(DesignTokens.background)
            .navigationTitle("Refinement")
        }
    }

    private func loadImage(from item: PhotosPickerItem?) async {
        guard let item else { return }
        errorMessage = nil
        analysis = nil
        do {
            if let data = try await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                previewImage = image
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func analyze(image: UIImage) async {
        isAnalyzing = true
        errorMessage = nil
        defer { isAnalyzing = false }
        guard let data = image.jpegData(compressionQuality: 0.85) else {
            errorMessage = "Could not encode image."
            return
        }
        let base64 = data.base64EncodedString()
        do {
            let res = try await APIClient.shared.analyzeRefine(imageBase64: base64)
            if res.ok == true, let result = res.analysis {
                analysis = result
            } else {
                errorMessage = res.error ?? "Analysis failed"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
