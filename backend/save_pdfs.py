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

def _clean(s):
    if s is None:
        return ""
    s = str(s)
    s = re.sub(r'[\*_`]', '', s)
    s = s.replace('–', '-').replace('“', '"').replace('”', '"')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def _page_blocks(page):
    blocks = page.get_text("blocks")
    out = []
    for b in blocks:
        if not isinstance(b, (list, tuple)) or len(b) < 5:
            continue
        x0, y0, x1, y1, text = b[:5]
        if not text:
            continue
        out.append((float(x0), float(y0), float(x1), float(y1), str(text)))
    out.sort(key=lambda t: (t[1], t[0]))
    return out

def _find_heading_y_on_page(page, title):
    title_c = _clean(title)
    if not title_c:
        return None
    data = page.get_text("dict")
    best = None
    for block in data.get("blocks", []):
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans:
                continue
            line_text = " ".join(_clean(span.get("text", "")) for span in spans if span.get("text"))
            if not line_text:
                continue
            lc = line_text.strip()
            if lc == title_c or lc.rstrip(":") == title_c or lc.startswith(title_c) or title_c in lc:
                y_top = float(line.get("bbox", [0, 0, 0, 0])[1])
                max_size = max(float(s.get("size", 0)) for s in spans)
                cand = (y_top, -max_size)
                if best is None or cand < best:
                    best = cand
    if best is not None:
        return float(best[0])
    rects = page.search_for(title_c)
    if rects:
        rect = sorted(rects, key=lambda r: (r.y0, r.x0))[0]
        return float(rect.y0)
    return None

def _sanitize_headings_with_positions(pdf_path, headings_list):
    doc = fitz.open(pdf_path)
    try:
        page_count = doc.page_count
        seen = set()
        rows = []
        for h in headings_list:
            if not isinstance(h, (list, tuple)) or len(h) < 2:
                continue
            title = _clean(h[0])
            try:
                p0 = int(h[1])
            except (ValueError, TypeError):
                continue
            if not title or p0 < 0 or p0 >= page_count:
                continue
            key = (title, p0)
            if key in seen:
                continue
            seen.add(key)
            y = _find_heading_y_on_page(doc[p0], title)
            rows.append({"title": title, "page0": p0, "y": y})
        rows.sort(key=lambda r: (r["page0"], r["y"] if r["y"] is not None else -1.0))
        return rows, page_count
    finally:
        doc.close()

def _extract_range_text(doc, start_page0, start_y, end_page0, end_y):
    if start_y is None:
        start_y = 0.0
    else:
        start_y = float(start_y)
    if end_page0 is None:
        end_page0 = doc.page_count - 1
        end_y = None
    text_parts = []
    for p in range(start_page0, end_page0 + 1):
        blocks = _page_blocks(doc[p])
        if p == start_page0 and p == end_page0:
            for x0, y0, x1, y1, text in blocks:
                if y0 >= start_y and (end_y is None or y0 < float(end_y)):
                    text_parts.append(text)
        elif p == start_page0:
            for x0, y0, x1, y1, text in blocks:
                if y0 >= start_y:
                    text_parts.append(text)
        elif p == end_page0:
            for x0, y0, x1, y1, text in blocks:
                if end_y is None or y0 < float(end_y):
                    text_parts.append(text)
        else:
            for _, _, _, _, text in blocks:
                text_parts.append(text)
    return "\n".join(text_parts)

def extract_sections_from_pdf(pdf_path, headings_list):
    doc = fitz.open(pdf_path)
    try:
        heads, _ = _sanitize_headings_with_positions(pdf_path, headings_list)
        if not heads:
            return []
        sections = []
        for i, h in enumerate(heads):
            sp = h["page0"]
            sy = h["y"]
            if i + 1 < len(heads):
                npg = heads[i + 1]["page0"]
                ny = heads[i + 1]["y"]
            else:
                npg, ny = None, None
            content = _extract_range_text(doc, sp, sy, npg, ny)
            sections.append({"title": h["title"], "content": content, "page": sp + 1})
        return sections
    finally:
        doc.close()

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
    index_path = os.path.join(parent_folder, "mysession_index.faiss")
    meta_path = os.path.join(parent_folder, "mysession_metadata.json")
    index, metadata = load_index_and_metadata(index_path, meta_path, dim)
    new_sections = []
    for filename in os.listdir(pdf_folder):
        if not filename.lower().endswith(".pdf"):
            continue
        if any(m.get("document") == filename for m in metadata):
            continue
        pdf_path = os.path.join(pdf_folder, filename)
        extracted_headings = main_process_pdf(pdf_path)
        if not extracted_headings:
            continue
        outline = extracted_headings.get("outline", [])
        headings = [[el.get("text"), el.get("page")] for el in outline if el.get("level") in ["H1", "H2"]]
        sections = extract_sections_from_pdf(pdf_path, headings)
        for sec in sections:
            chunk_text = f"{sec['title']} - {combine_lines(sec['content'])}"
            if len(chunk_text.strip()) < 30:
                continue
            new_sections.append({
                "document": filename,
                "title": sec["title"],
                "content": chunk_text,
                "page": sec["page"]
            })
    if not new_sections:
        print("⚠ No new sections extracted. Index not updated.")
        return
    embeddings = model.encode([s["content"] for s in new_sections], normalize_embeddings=True)
    index.add(np.array(embeddings).astype('float32'))
    metadata.extend(new_sections)
    faiss.write_index(index, index_path)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print(f"✅ Appended {len(new_sections)} new sections to FAISS index.")
    print(f"📂 Index saved to: {index_path}")
    print(f"📂 Metadata saved to: {meta_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf_folder", type=str, required=True)
    parser.add_argument("--session_id", type=str, required=True)
    args = parser.parse_args()
    build_faiss_index(args.pdf_folder, args.session_id)
