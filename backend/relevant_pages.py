import faiss
import json
from sentence_transformers import SentenceTransformer
from pathlib import Path
import argparse
import numpy as np

INDEX_PATH = Path("round1b") / "mysession_index.faiss"
MAPPING_PATH = Path("round1b") / "mysession_metadata.json"

model = SentenceTransformer("intfloat/e5-small-v2")
print("relevant_pages ....loading")

def get_relevant_pages(query_text: str, top_k: int = 3):
    print("now in the relevant pages .py file")

    if not INDEX_PATH.exists() or not MAPPING_PATH.exists():
        raise FileNotFoundError("FAISS index or metadata file not found.")

    index = faiss.read_index(str(INDEX_PATH))

    with open(MAPPING_PATH, "r", encoding="utf-8") as f:
        index_mapping = json.load(f)  # list of dicts

    # normalize for cosine similarity
    query_embedding = model.encode([query_text], normalize_embeddings=True)
    query_embedding = np.array(query_embedding).astype("float32")

    scores, indices = index.search(query_embedding, top_k)

    results = []
    for idx, score in zip(indices[0], scores[0]):
        if 0 <= idx < len(index_mapping):
            entry = index_mapping[idx]
            results.append({
                "pdfName": entry["document"],
                "pageNo": entry["page"],
                "title": entry.get("title", f"Match for '{query_text}'"),
                "snippet": entry.get("content", "")[:200] + "...",
                "score": float(score)  # cosine similarity, closer to 1.0 = better
            })

    # sort explicitly (descending cosine similarity)
    results.sort(key=lambda x: x["score"], reverse=True)

    print("🔎 Top results:", json.dumps(results, indent=2, ensure_ascii=False))
    return results

print("results are out successfully")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", type=str, required=True)
    parser.add_argument("--top_k", type=int, default=3)
    args = parser.parse_args()

    output = get_relevant_pages(args.query, args.top_k)
    print(json.dumps(output, indent=2, ensure_ascii=False))