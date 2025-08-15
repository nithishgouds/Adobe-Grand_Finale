# relevant_pages.py
import faiss
import pickle
from sentence_transformers import SentenceTransformer
from pathlib import Path
import argparse

# Paths
INDEX_PATH = Path("round1b") / "faiss_index.index"
MAPPING_PATH = Path("round1b") / "index_mapping.pkl"

# Load model (same as in save_pdfs.py)
model = SentenceTransformer("intfloat/e5-small-v2")

def get_relevant_pages(query_text: str, top_k: int = 3):
    # Load FAISS index
    if not INDEX_PATH.exists() or not MAPPING_PATH.exists():
        raise FileNotFoundError("FAISS index or mapping file not found.")

    index = faiss.read_index(str(INDEX_PATH))

    with open(MAPPING_PATH, "rb") as f:
        index_mapping = pickle.load(f)  # {idx: {"pdfName": str, "pageNo": int, "snippet": str}}

    # Convert query to embedding
    query_embedding = model.encode([query_text], convert_to_numpy=True)

    # Search in FAISS index
    distances, indices = index.search(query_embedding, top_k)

    results = []
    for idx, dist in zip(indices[0], distances[0]):
        if idx in index_mapping:
            entry = index_mapping[idx]
            results.append({
                "pdfName": entry["pdfName"],
                "pageNo": entry["pageNo"],
                "title": entry.get("title", "No title"),
                "snippet": entry.get("snippet", ""),
                "score": float(dist)
            })

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", type=str, required=True, help="Selected text to search")
    parser.add_argument("--top_k", type=int, default=3)
    args = parser.parse_args()

    output = get_relevant_pages(args.query, args.top_k)
    print(output)
