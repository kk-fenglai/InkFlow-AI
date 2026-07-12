import PDFKit
import SwiftUI
import UniformTypeIdentifiers

struct SignPDFView: View {
    @Environment(AuthStore.self) private var auth
    @State private var pdfData: Data?
    @State private var pdfFileName = "document.pdf"
    @State private var pdfDocument: PDFDocument?
    @State private var pageSize = CGSize(width: 612, height: 792)
    @State private var signatureImage: UIImage?
    @State private var signatures: [SavedSignatureDTO] = []
    @State private var selectedSignatureId: String?
    @State private var placement = CGRect(x: 72, y: 120, width: 160, height: 60)
    @State private var showPDFPicker = false
    @State private var isSigning = false
    @State private var signedPDFData: Data?
    @State private var signedFileName: String?
    @State private var showShare = false
    @State private var errorMessage: String?
    @State private var sesAccepted = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Button {
                        showPDFPicker = true
                    } label: {
                        Label(pdfData == nil ? "Select PDF" : pdfFileName, systemImage: "doc.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(DesignTokens.surfaceContainerLow)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    if !signatures.isEmpty {
                        Picker("Signature", selection: $selectedSignatureId) {
                            Text("Choose…").tag(Optional<String>.none)
                            ForEach(signatures) { sig in
                                Text(sig.name).tag(Optional(sig.id))
                            }
                        }
                        .onChange(of: selectedSignatureId) { _, id in
                            if let id, let sig = signatures.first(where: { $0.id == id }),
                               let b64 = SignatureImageRenderer.pngBase64(from: sig.strokeData),
                               let data = Data(base64Encoded: b64) {
                                signatureImage = UIImage(data: data)
                            }
                        }
                    }

                    if let pdfDocument, let signatureImage {
                        PDFPagePreview(document: pdfDocument, pageIndex: 0, placement: $placement)
                            .frame(height: 360)
                            .clipShape(RoundedRectangle(cornerRadius: 8))

                        Text("Drag the signature box to position it on the page.")
                            .font(.caption)
                            .foregroundStyle(DesignTokens.onSurfaceVariant)

                        Toggle("I accept the SES disclaimer (1 credit)", isOn: $sesAccepted)
                            .font(.footnote)

                        Button {
                            Task { await signPDF() }
                        } label: {
                            HStack {
                                if isSigning { ProgressView().tint(.white) }
                                Text("Sign PDF")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(DesignTokens.tertiary)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                        .disabled(isSigning || !sesAccepted)
                    }

                    if let errorMessage {
                        Text(errorMessage).font(.footnote).foregroundStyle(.red)
                    }

                    if signedPDFData != nil {
                        Button("Share signed PDF") { showShare = true }
                            .buttonStyle(.borderedProminent)
                    }
                }
                .padding()
            }
            .background(DesignTokens.background)
            .navigationTitle("Sign PDF")
            .fileImporter(
                isPresented: $showPDFPicker,
                allowedContentTypes: [.pdf],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    loadPDF(from: url)
                case .failure(let err):
                    errorMessage = err.localizedDescription
                }
            }
            .sheet(isPresented: $showShare) {
                if let signedPDFData, let signedFileName {
                    if let url = writeTempPDF(data: signedPDFData, name: signedFileName) {
                        ShareSheet(items: [url])
                    }
                }
            }
            .task { await loadSignatures() }
        }
    }

    private func loadSignatures() async {
        do {
            signatures = try await APIClient.shared.fetchSignatures()
            if let first = signatures.first {
                selectedSignatureId = first.id
                if let b64 = SignatureImageRenderer.pngBase64(from: first.strokeData),
                   let data = Data(base64Encoded: b64) {
                    signatureImage = UIImage(data: data)
                }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadPDF(from url: URL) {
        errorMessage = nil
        signedPDFData = nil
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        do {
            let data = try Data(contentsOf: url)
            guard data.count <= 10 * 1024 * 1024 else {
                errorMessage = "PDF exceeds 10 MB limit."
                return
            }
            pdfData = data
            pdfFileName = url.lastPathComponent
            if let doc = PDFDocument(data: data), let page = doc.page(at: 0) {
                pdfDocument = doc
                let bounds = page.bounds(for: .mediaBox)
                pageSize = bounds.size
                placement = CGRect(
                    x: bounds.width * 0.1,
                    y: bounds.height * 0.15,
                    width: 160,
                    height: 60
                )
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func signPDF() async {
        guard let pdfData, let signatureImage,
              let sigData = signatureImage.pngData() else { return }
        isSigning = true
        errorMessage = nil
        defer { isSigning = false }

        let pdfX = Double(placement.origin.x)
        let pdfY = Double(pageSize.height - placement.origin.y - placement.height)
        let pdfW = Double(placement.width)
        let pdfH = Double(placement.height)

        do {
            let res = try await APIClient.shared.signPDF(
                pdfBase64: pdfData.base64EncodedString(),
                signaturePngBase64: sigData.base64EncodedString(),
                pageIndex: 0,
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
                fileName: pdfFileName
            )
            if res.ok == true, let outB64 = res.pdfBase64,
               let outData = Data(base64Encoded: outB64) {
                signedPDFData = outData
                signedFileName = res.fileName ?? "signed.pdf"
                await auth.refreshUser()
            } else {
                errorMessage = res.error ?? "Signing failed"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func writeTempPDF(data: Data, name: String) -> URL? {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        do {
            try data.write(to: url)
            return url
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }
}

private struct PDFPagePreview: View {
    let document: PDFDocument
    let pageIndex: Int
    @Binding var placement: CGRect

    var body: some View {
        GeometryReader { geo in
            let page = document.page(at: pageIndex)!
            let pageBounds = page.bounds(for: .mediaBox)
            let scale = min(geo.size.width / pageBounds.width, geo.size.height / pageBounds.height)
            let drawSize = CGSize(width: pageBounds.width * scale, height: pageBounds.height * scale)
            let offset = CGPoint(
                x: (geo.size.width - drawSize.width) / 2,
                y: (geo.size.height - drawSize.height) / 2
            )

            ZStack(alignment: .topLeading) {
                PDFKitView(document: document, pageIndex: pageIndex)
                    .frame(width: drawSize.width, height: drawSize.height)
                    .position(x: geo.size.width / 2, y: geo.size.height / 2)

                DraggableSignatureBox(rect: $placement, scale: scale, offset: offset)
            }
        }
        .background(Color(white: 0.95))
    }
}

private struct PDFKitView: UIViewRepresentable {
    let document: PDFDocument
    let pageIndex: Int

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.document = document
        view.autoScales = true
        view.displayMode = .singlePage
        view.displayDirection = .vertical
        if let page = document.page(at: pageIndex) {
            view.go(to: page)
        }
        view.isUserInteractionEnabled = false
        return view
    }

    func updateUIView(_ uiView: PDFView, context: Context) {}
}

private struct DraggableSignatureBox: View {
    @Binding var rect: CGRect
    let scale: CGFloat
    let offset: CGPoint
    @State private var dragStart: CGPoint?

    var body: some View {
        let displayRect = CGRect(
            x: offset.x + rect.origin.x * scale,
            y: offset.y + rect.origin.y * scale,
            width: rect.width * scale,
            height: rect.height * scale
        )

        RoundedRectangle(cornerRadius: 4)
            .stroke(DesignTokens.tertiary, lineWidth: 2)
            .background(DesignTokens.tertiary.opacity(0.15))
            .frame(width: displayRect.width, height: displayRect.height)
            .position(x: displayRect.midX, y: displayRect.midY)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        let newX = (value.location.x - offset.x) / scale
                        let newY = (value.location.y - offset.y) / scale
                        rect.origin = CGPoint(x: max(0, newX), y: max(0, newY))
                    }
            )
    }
}
