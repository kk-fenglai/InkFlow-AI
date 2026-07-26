import SwiftUI

struct StudioView: View {
    @Environment(AuthStore.self) private var auth
    @State private var signatureText = ""
    @State private var selectedBaseId = "poet"
    @State private var fluidity = 50.0
    @State private var rhythm = 50.0
    @State private var pressure = 50.0
    @State private var isGenerating = false
    @State private var isSaving = false
    @State private var strokeData: StrokeDataDTO?
    @State private var resultMessage: String?
    @State private var errorMessage: String?
    @State private var shareImage: UIImage?
    @State private var showShare = false

    private var selectedBase: SignatureBases.Base {
        SignatureBases.free.first { $0.id == selectedBaseId } ?? SignatureBases.free[0]
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Hand-drawn AI Studio")
                        .font(.title2)
                        .foregroundStyle(DesignTokens.onSurface)

                    TextField("Signature text", text: $signatureText)
                        .padding()
                        .background(DesignTokens.surfaceContainerLow)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Template")
                            .font(.subheadline.weight(.semibold))
                        Picker("Template", selection: $selectedBaseId) {
                            ForEach(SignatureBases.free) { base in
                                Text(base.name).tag(base.id)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: selectedBaseId) { _, id in
                            applyBaseDefaults(id)
                        }
                    }

                    sliderRow("Fluidity", value: $fluidity)
                    sliderRow("Rhythm", value: $rhythm)
                    sliderRow("Pressure", value: $pressure)

                    if let credits = auth.user?.credits {
                        Text("\(credits) credits available")
                            .font(.caption)
                            .foregroundStyle(DesignTokens.tertiary)
                    }

                    if let strokeData {
                        SignaturePreviewView(strokeData: strokeData)
                            .frame(height: 140)

                        HStack(spacing: 12) {
                            Button("Save to Library") {
                                Task { await saveToLibrary(strokeData) }
                            }
                            .buttonStyle(.bordered)
                            .disabled(isSaving)

                            if shareImage != nil {
                                Button {
                                    showShare = true
                                } label: {
                                    Label("Share PNG", systemImage: "square.and.arrow.up")
                                }
                            }
                        }
                    }

                    Button {
                        Task { await generate() }
                    } label: {
                        HStack {
                            if isGenerating { ProgressView().tint(.white) }
                            Text("Render Final Ink (1 credit)")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(DesignTokens.onSurface)
                        .foregroundStyle(DesignTokens.background)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .disabled(signatureText.trimmingCharacters(in: .whitespaces).isEmpty || isGenerating)

                    if let resultMessage {
                        Text(resultMessage).font(.footnote).foregroundStyle(DesignTokens.tertiary)
                    }
                    if let errorMessage {
                        Text(errorMessage).font(.footnote).foregroundStyle(.red)
                    }
                }
                .padding()
            }
            .background(DesignTokens.background)
            .sheet(isPresented: $showShare) {
                if let shareImage {
                    ShareSheet(items: [shareImage])
                }
            }
            .onAppear {
                applyBaseDefaults(selectedBaseId)
            }
        }
    }

    private func sliderRow(_ title: String, value: Binding<Double>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(DesignTokens.onSurfaceVariant)
                Spacer()
                Text("\(Int(value.wrappedValue))")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(DesignTokens.tertiary)
            }
            Slider(value: value, in: 1...100, step: 1)
        }
    }

    private func applyBaseDefaults(_ id: String) {
        guard let base = SignatureBases.free.first(where: { $0.id == id }) else { return }
        fluidity = base.fluidity
        rhythm = base.rhythm
        pressure = base.pressure
    }

    private func generate() async {
        isGenerating = true
        errorMessage = nil
        resultMessage = nil
        strokeData = nil
        shareImage = nil
        defer { isGenerating = false }
        do {
            let res = try await APIClient.shared.generateFinalInk(
                text: signatureText.trimmingCharacters(in: .whitespaces),
                baseId: selectedBaseId,
                fluidity: fluidity,
                rhythm: rhythm,
                pressure: pressure,
                slant: selectedBase.slant,
                size: selectedBase.size
            )
            if res.ok == true, let data = res.strokeData {
                strokeData = data
                resultMessage = "Signature ready."
                if let b64 = SignatureImageRenderer.pngBase64(from: data),
                   let imgData = Data(base64Encoded: b64) {
                    shareImage = UIImage(data: imgData)
                }
                await auth.refreshUser()
            } else {
                errorMessage = res.error ?? "Generation failed"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveToLibrary(_ data: StrokeDataDTO) async {
        isSaving = true
        defer { isSaving = false }
        do {
            let name = signatureText.trimmingCharacters(in: .whitespaces)
            let res = try await APIClient.shared.saveSignature(
                name: name.isEmpty ? "My Signature" : name,
                strokeData: data
            )
            if res.ok == true {
                resultMessage = "Saved to cloud library."
                await auth.refreshUser()
            } else {
                errorMessage = res.error ?? "Save failed"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
