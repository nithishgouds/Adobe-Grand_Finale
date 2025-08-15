import os
import re
import argparse
import json
import fitz
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from process_pdfs import main_process_pdf

def combine_lines(s):
    """Cleans and combines multi-line text into one paragraph."""
    s = re.sub(r'^[\s]*[•\-–o]+\s*', '', s, flags=re.MULTILINE)
    lines = [line.strip() for line in s.splitlines() if line.strip()]
    result = []
    temp = ""

    for line in lines:
        if re.search(r'[.?!:,]$', line):
            if temp:
                temp += " " + line
                result.append(temp.strip())
                temp = ""
            else:
                result.append(line)
        else:
            if temp:
                temp += ", " + line
            else:
                temp = line

    if temp:
        result.append(temp.strip())

    return ' '.join(result)

def extract_sections_from_pdf(pdf_path, headings_list):
    """Gets sections from PDF based on headings list."""
    heading_page_map = {h[0].strip(): h[1] for h in headings_list}
    heading_texts = list(heading_page_map.keys())

    doc = fitz.open(pdf_path)
    lines = "\n".join([page.get_text() for page in doc]).splitlines()
    doc.close()

    sections = []
    current_section = None
    for line in lines:
        line_stripped = line.strip()
        if line_stripped in heading_texts:
            if current_section:
                sections.append(current_section)
            current_section = {
                "title": line_stripped,
                "content": "",
                "page": heading_page_map[line_stripped]
            }
        elif current_section:
            current_section["content"] += line + "\n"

    if current_section:
        sections.append(current_section)

    return sections

def build_faiss_index(pdf_folder, session_id):
    """Builds FAISS index from all PDFs in folder without user query."""
    model = SentenceTransformer("intfloat/e5-small-v2")
    all_sections = []

    for filename in os.listdir(pdf_folder):
        if not filename.lower().endswith(".pdf"):
            continue

        pdf_path = os.path.join(pdf_folder, filename)
        extracted_headings = main_process_pdf(pdf_path)
        if not extracted_headings:
            continue

        outline = extracted_headings["outline"]
        headings = [[el["text"], el["page"]] for el in outline if el["level"] in ["H1", "H2"]]
        sections = extract_sections_from_pdf(pdf_path, headings)

        for sec in sections:
            chunk_text = f"{sec['title']} - {combine_lines(sec['content'])}"
            if len(chunk_text.strip()) < 30:
                continue
            all_sections.append({
                "document": filename,
                "title": sec["title"],
                "content": chunk_text,
                "page": sec["page"] + 1
            })

    if not all_sections:
        print("⚠ No sections extracted. No index created.")
        return

    embeddings = model.encode([sec["content"] for sec in all_sections], normalize_embeddings=True)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(np.array(embeddings).astype('float32'))

    index_path = os.path.join(pdf_folder, f"{session_id}_index.faiss")
    meta_path = os.path.join(pdf_folder, f"{session_id}_metadata.json")

    faiss.write_index(index, index_path)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(all_sections, f, ensure_ascii=False, indent=2)

    print(f"✅ FAISS index saved to: {index_path}")
    print(f"✅ Metadata saved to: {meta_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf_folder", type=str, required=True)
    parser.add_argument("--session_id", type=str, required=True)
    args = parser.parse_args()

    build_faiss_index(args.pdf_folder, args.session_id)
