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
    s = re.sub(r'^[\s][•\-–o]+\s', '', s, flags=re.MULTILINE)
    lines = [line.strip() for line in s.splitlines() if line.strip()]
    result, temp = [], ""
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
    heading_page_map = {h[0].strip(): h[1] for h in headings_list}
    heading_texts = list(heading_page_map.keys())
    doc = fitz.open(pdf_path)
    lines = "\n".join([page.get_text() for page in doc]).splitlines()
    doc.close()
    sections, current_section = [], None
    for line in lines:
        line_stripped = line.strip()
        if line_stripped in heading_texts:
            if current_section:
                sections.append(current_section)
            current_section = {
                "title": line_stripped, "content": "", "page": heading_page_map[line_stripped]}
        elif current_section:
            current_section["content"] += line + "\n"
    if current_section:
        sections.append(current_section)
    return sections


def load_index_and_metadata(index_path, meta_path, dim):
    if os.path.exists(index_path) and os.path.exists(meta_path):
        index = faiss.read_index(index_path)
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
    else:
        index = faiss.IndexFlatIP(dim)
        metadata = []
    return index, metadata


def build_faiss_index(pdf_folder, session_id):
    model = SentenceTransformer("intfloat/e5-base-v2")
    dim = model.get_sentence_embedding_dimension()
    parent_folder = os.path.abspath(os.path.join(pdf_folder, os.pardir))
    index_path = os.path.join(parent_folder, f"mysession_index.faiss")
    meta_path = os.path.join(parent_folder, f"mysession_metadata.json")
    index, metadata = load_index_and_metadata(index_path, meta_path, dim)
    new_sections = []
    for filename in os.listdir(pdf_folder):
        if not filename.lower().endswith(".pdf"):
            continue
        if any(m["document"] == filename for m in metadata):
            continue
        pdf_path = os.path.join(pdf_folder, filename)
        extracted_headings = main_process_pdf(pdf_path)
        if not extracted_headings:
            continue
        outline = extracted_headings["outline"]
        headings = [[el["text"], el["page"]]
                    for el in outline if el["level"] in ["H1", "H2"]]
        sections = extract_sections_from_pdf(pdf_path, headings)
        for sec in sections:
            chunk_text = f"{sec['title']} - {combine_lines(sec['content'])}"
            if len(chunk_text.strip()) < 30:
                continue
            new_sections.append(
                {"document": filename, "title": sec["title"], "content": chunk_text, "page": sec["page"] + 1})
    if not new_sections:
        print("⚠ No new sections extracted. Index not updated.")
        return
    embeddings = model.encode([sec["content"]
                              for sec in new_sections], normalize_embeddings=True)
    index.add(np.array(embeddings).astype('float32'))
    metadata.extend(new_sections)
    faiss.write_index(index, index_path)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print(f"Appended {len(new_sections)} new sections to FAISS index.")
    print(f"Index saved to: {index_path}")
    print(f"Metadata saved to: {meta_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf_folder", type=str, required=True)
    parser.add_argument("--session_id", type=str, required=True)
    args = parser.parse_args()
    build_faiss_index(args.pdf_folder, args.session_id)
