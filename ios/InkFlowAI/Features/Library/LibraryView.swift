import SwiftUI

@MainActor
@Observable
final class LibraryStore {
    var signatures: [SavedSignatureDTO] = []
    var isLoading = false
    var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            signatures = try await APIClient.shared.fetchSignatures()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func delete(id: String) async {
        do {
            try await APIClient.shared.deleteSignature(id: id)
            signatures.removeAll { $0.id == id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct LibraryView: View {
    @State private var store = LibraryStore()
    @State private var showError = false

    var body: some View {
        NavigationStack {
            Group {
                if store.isLoading && store.signatures.isEmpty {
                    ProgressView()
                } else if store.signatures.isEmpty {
                    ContentUnavailableView(
                        "No signatures yet",
                        systemImage: "books.vertical",
                        description: Text("Generate in Studio and save to cloud.")
                    )
                } else {
                    List {
                        ForEach(store.signatures) { item in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(item.name)
                                    .font(.headline)
                                SignaturePreviewView(strokeData: item.strokeData)
                                    .frame(height: 80)
                                Text(item.savedAt)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 4)
                        }
                        .onDelete { indexSet in
                            Task {
                                for index in indexSet {
                                    let id = store.signatures[index].id
                                    await store.delete(id: id)
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Cloud Library")
            .refreshable { await store.load() }
            .task { await store.load() }
            .onChange(of: store.errorMessage) { _, msg in
                showError = msg != nil
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { store.errorMessage = nil }
            } message: {
                Text(store.errorMessage ?? "")
            }
        }
        .background(DesignTokens.background)
    }
}
