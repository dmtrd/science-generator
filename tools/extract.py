#!/usr/bin/env python3
"""
Extract AQA GCSE question papers + mark schemes into the generator's JS format.

    python3 tools/extract.py \
        --qp "AQA-84611H-QP-JUN23.PDF" \
        --ms "AQA-84611H-MS-JUN23.PDF" \
        --out data/questions/aqa-8461-1h-jun23.js \
        --label "AQA GCSE Biology Paper 1H June 2023" \
        --prefix aqa-8461-1h-jun23

How it works
------------
Mark scheme: AQA mark schemes are real PDF tables, so each row is read directly
  (question number, answers, extra information, mark, AO / spec ref). The spec
  ref (e.g. 4.2.3.1) is what tags the question to a topic.
Question paper: split on the "0 1 . 4" part markers. Each part's text runs to
  its "[n marks]" tag; the text after the tag is either multiple-choice options
  or the shared stem for the next part.
Figures: each "Figure n" region is cropped to a PNG next to its caption.

Each extracted part becomes one question in the bank, so the worksheet builder
can hit a time target accurately.
"""

import argparse, json, os, re
import pymupdf


# AQA GCSE Biology 8461 spec prefix -> topic id in data/structure.js
SPEC_TO_TOPIC = {
    "4.1": "gcse-bio-1", "4.2": "gcse-bio-2", "4.3": "gcse-bio-3",
    "4.4": "gcse-bio-4", "4.5": "gcse-bio-5", "4.6": "gcse-bio-6",
    "4.7": "gcse-bio-7",
}

NOISE_PATTERNS = [
    r"Do not write outside the box", r"IB/M/ ?\S*\d+/\d+/\d+\w*",
    r"\*[a-zA-Z0-9]*\d+[a-zA-Z0-9]*\*",
    r"Turn over for (the )?next question", r"for (the )?next question", r"Question \d+ continues on the next page",
    r"Turn over [►▶>]*",
    r"END OF QUESTIONS", r"BLANK PAGE", r"Copyright information",
    r"DO NOT WRITE ON THIS PAGE", r"ANSWER IN THE SPACES PROVIDED",
    r"Extra space", r"For Examiner.s Use", r"Question Mark TOTAL",
    r"Tick \(?[^)]{0,4}\)? ?(one|two|three) box\.?",
]


def denoise(text):
    """Remove page furniture. Whitespace is normalised first so that patterns
    match across the line breaks the PDF extractor inserts."""
    text = re.sub(r"\s+", " ", text)
    for pat in NOISE_PATTERNS:
        text = re.sub(pat, " ", text, flags=re.I)
    return text


def drop_furniture_lines(t):
    """Line-level cleanup: rules and page numbers only make sense per line."""
    keep = []
    for line in t.split("\n"):
        line = line.strip()
        if not line or re.fullmatch(r"[_.\s\-–—]{3,}", line):
            continue
        if re.fullmatch(r"\d{1,2}", line):                 # page number
            continue
        if re.fullmatch(r"\d\s*\d\s*\.?\s*\d?", line):     # stray part marker
            continue
        keep.append(line)
    return "\n".join(keep)


def tidy(t):
    out = denoise(drop_furniture_lines(t))
    out = re.sub(r"\s{2,}", " ", out).strip()
    # a page number or part marker that survived because it shared a line
    out = re.sub(r"^\d{1,2}\s+(?=[A-Z(])", "", out)
    out = re.sub(r"^[.\s,;:]+", "", out)          # stray leading punctuation
    out = re.sub(r"^(?:one\s+)?box\.?\s*", "", out, flags=re.I)  # tick-box remnant
    out = re.sub(r"^(?:[A-D]\s+){2,}(?=[A-Z])", "", out)   # leftover option letters
    return out.strip()


# ===============================================================
# MARK SCHEME (real PDF tables)
# ===============================================================
def parse_mark_scheme(path):
    """{'01.4': {answer, extra, marks, spec, levelled}}

    Handles both mark scheme table shapes: the usual
    Question | Answers | Extra information | Mark | AO/Spec
    and the level-of-response one, which has no Extra information column.
    """
    doc = pymupdf.open(path)
    out = {}
    for page in doc:
        try:
            tables = page.find_tables().tables
        except Exception:
            continue
        for tab in tables:
            rows = tab.extract()
            if not rows:
                continue
            header = [(c or "").replace("\n", " ").lower() for c in rows[0]]
            if not any("question" in h for h in header):
                continue
            col = column_map(header)
            if col.get("answer") is None:
                continue

            current = None
            for row in rows[1:]:
                cells = [(c or "").replace("\n", " ").strip() for c in row]
                if not cells:
                    continue
                qcell = cells[col["question"]] if col.get("question") is not None else ""
                if re.fullmatch(r"\d{2}\.\d", qcell):
                    current = qcell
                elif current is None:
                    continue
                # a row with an empty question cell continues the previous question
                rec = out.setdefault(current, {"answer": "", "extra": "", "marks": None,
                                               "spec": None, "levelled": False})
                rec["answer"] = (rec["answer"] + " " + pick(cells, col, "answer")).strip()
                rec["extra"] = (rec["extra"] + " " + pick(cells, col, "extra")).strip()

                mark_cell = pick(cells, col, "mark")
                rng = re.search(r"(\d)\s*[-–—]\s*(\d)", mark_cell)
                if rng:
                    rec["levelled"] = True
                    rec["marks"] = max(rec["marks"] or 0, int(rng.group(2)))
                else:
                    m = re.search(r"\b([1-9])\b", mark_cell)
                    if m and not rec["marks"]:
                        rec["marks"] = int(m.group(1))

                sm = re.search(r"(\d\.\d(?:\.\d+)*)", pick(cells, col, "spec"))
                if sm and not rec["spec"]:
                    rec["spec"] = sm.group(1)
    doc.close()

    if len(out) < 10:
        # Older mark schemes repeat the column header only once, so PDF table
        # detection finds nothing usable. Fall back to reading by position.
        out = parse_mark_scheme_positional(path) or out

    for rec in out.values():
        rec["answer"] = clean_answer(rec["answer"])
        rec["extra"] = clean_answer(rec["extra"])
        if rec["marks"] is None:
            rec["marks"] = 1
    return out


QNO_RE = re.compile(r"^\d{2}\.\d$")


def parse_mark_scheme_positional(path):
    """Read a mark scheme by word position instead of table structure.

    The layout is the same on every page (Question | Answers | Extra
    information | Mark | AO / Spec Ref.), so the column x-boundaries are taken
    from wherever the header appears and then applied to every page.
    """
    doc = pymupdf.open(path)
    bounds = find_column_bounds(doc)
    if not bounds:
        doc.close()
        return {}

    out = {}
    for page in doc:
        words = [w for w in page.get_text("words") if w[4].strip()]
        if not words:
            continue
        # question numbers sit in the leftmost column
        anchors = sorted(
            [w for w in words if QNO_RE.match(w[4].strip()) and w[0] < bounds["answer"]],
            key=lambda w: w[1],
        )
        if not anchors:
            continue
        for i, a in enumerate(anchors):
            qno = a[4].strip()
            top = a[1] - 2
            bottom = anchors[i + 1][1] - 2 if i + 1 < len(anchors) else page.rect.y1
            band = [w for w in words if w[1] >= top and w[3] <= bottom + 4]
            rec = out.setdefault(qno, {"answer": "", "extra": "", "marks": None,
                                       "spec": None, "levelled": False})
            rec["answer"] = (rec["answer"] + " " + column_text(band, bounds, "answer")).strip()
            rec["extra"] = (rec["extra"] + " " + column_text(band, bounds, "extra")).strip()

            mark_text = column_text(band, bounds, "mark")
            rng = re.search(r"(\d)\s*[-–—‒]\s*(\d)", mark_text)
            if rng:
                rec["levelled"] = True
                rec["marks"] = max(rec["marks"] or 0, int(rng.group(2)))
            else:
                m = re.search(r"\b([1-9])\b", mark_text)
                if m and not rec["marks"]:
                    rec["marks"] = int(m.group(1))

            sm = re.search(r"(\d\.\d(?:\.\d+)*)", column_text(band, bounds, "spec"))
            if sm and not rec["spec"]:
                rec["spec"] = sm.group(1)
    doc.close()
    return out


def find_column_bounds(doc):
    """x start of each column, taken from a real header ROW.

    The words Question / Answers / Extra information / Mark / AO must sit on
    the same line, otherwise a stray "Mark" in a paragraph of guidance would
    throw the boundaries off.
    """
    wanted = {"Question": "question", "Answers": "answer", "Extra": "extra",
              "Mark": "mark", "AO": "spec"}
    for page in doc:
        lines = {}
        for w in page.get_text("words"):
            lines.setdefault(round(w[1] / 3), []).append(w)
        for row in lines.values():
            hits = {}
            for w in row:
                token = w[4].strip()
                if token in wanted and wanted[token] not in hits:
                    hits[wanted[token]] = w[0]
            if {"question", "answer", "mark"} <= set(hits):
                bounds = {
                    "answer": hits["answer"],
                    "extra": hits.get("extra", hits["mark"]),
                    "mark": hits["mark"],
                    "spec": hits.get("spec", hits["mark"] + 30),
                }
                # columns must be in the expected left-to-right order
                xs = [bounds["answer"], bounds["extra"], bounds["mark"], bounds["spec"]]
                if xs == sorted(xs) and bounds["answer"] > 20:
                    return bounds
    return None


def column_text(band, bounds, name):
    """Words of a row band that fall inside one column, in reading order."""
    edges = sorted(bounds.items(), key=lambda kv: kv[1])
    names = [n for n, _ in edges]
    xs = [x for _, x in edges]
    if name not in names:
        return ""
    i = names.index(name)
    lo = xs[i] - 4
    hi = xs[i + 1] - 4 if i + 1 < len(xs) else 10000
    sel = [w for w in band if lo <= w[0] < hi]
    sel.sort(key=lambda w: (round(w[1] / 4), w[0]))
    return " ".join(w[4] for w in sel)


def column_map(header):
    col = {}
    for i, h in enumerate(header):
        if "question" in h and "question" not in col:
            col["question"] = i
        elif "answer" in h and "answer" not in col:
            col["answer"] = i
        elif "extra" in h and "extra" not in col:
            col["extra"] = i
        elif "mark" in h and "mark" not in col:
            col["mark"] = i
        elif ("ao" in h or "spec" in h) and "spec" not in col:
            col["spec"] = i
    return col


def pick(cells, col, name):
    i = col.get(name)
    if i is None or i >= len(cells):
        return ""
    return cells[i]


def clean_answer(a):
    a = re.sub(r"\s{2,}", " ", a or "").strip()
    a = re.sub(r"^\s*[•·]\s*", "", a)
    a = a.replace(" • ", "\n• ")
    return a.strip()


# ===============================================================
# QUESTION PAPER
# ===============================================================
PART_RE = re.compile(r"\n\s*(\d)\s*(\d)\s*\n?\s*\.?\s*\n?\s*(\d)\s*\n")
MARKS_RE = re.compile(r"\[\s*(\d+)\s*marks?\s*\]")
TICKBOX_RE = re.compile(r"tick\s*\(?[^)\n]{0,4}\)?\s*(one|two|three)\s*box", re.I)


def page_text_without_tables(page):
    """Page text with any text that sits inside a detected table removed.

    Tables are cropped to images separately, so leaving their flattened text in
    the question stem would just duplicate it as an unreadable run of numbers.
    """
    rects = []
    try:
        for tab in page.find_tables().tables:
            r = pymupdf.Rect(tab.bbox)
            # Ignore "tables" that cover most of the page: on some papers the
            # detector treats the whole answer area as one table, which would
            # strip the question text along with it.
            if r.get_area() > page.rect.get_area() * 0.55:
                continue
            if tab.col_count < 2 or tab.row_count < 2:
                continue
            rects.append(r)
    except Exception:
        pass
    if not rects:
        return page.get_text()

    out = []
    for block in page.get_text("blocks"):
        bbox = pymupdf.Rect(block[:4])
        text = block[4]
        inside = False
        for r in rects:
            overlap = (bbox & r).get_area()
            if bbox.get_area() > 0 and overlap / bbox.get_area() > 0.6:
                inside = True
                break
        if not inside:
            out.append(text)
    return "\n".join(out)


def parse_question_paper(path):
    doc = pymupdf.open(path)
    full = "\n" + "\n".join(page_text_without_tables(p) for p in doc) + "\n"
    doc.close()

    intros = question_intros(full)
    matches = list(PART_RE.finditer(full))
    raw = []
    for i, m in enumerate(matches):
        qno = f"{m.group(1)}{m.group(2)}.{m.group(3)}"
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full)
        chunk = full[m.end():end]
        mk = MARKS_RE.search(chunk)
        raw.append({
            "qno": qno,
            "text": tidy(chunk[: mk.start()] if mk else chunk),
            "tail": chunk[mk.end():] if mk else "",
            "marks": int(mk.group(1)) if mk else None,
            "pre": full[matches[i - 1].end() if i else 0: m.start()],
        })

    # The text after a part's "[n marks]" tag is either that part's tick-box
    # options, or the shared stem introducing the NEXT part.
    for r in raw:
        tb = TICKBOX_RE.search(r["tail"])
        if tb:
            r["options"], rest = extract_options(r["tail"][tb.end():])
            r["stem_for_next"] = r["tail"][:tb.start()] + "\n" + rest
        else:
            r["options"] = []
            r["stem_for_next"] = r["tail"]

    parts = []
    for i, r in enumerate(raw):
        prev = strip_front_matter(r["pre"]) if i == 0 else raw[i - 1]["stem_for_next"]
        context = drop_stray_options(tidy(prev))
        # Every part also gets the sentence or two that opened its question, so a
        # part like "Give one factor kept constant" still says what the
        # investigation was.
        intro = intros.get(r["qno"].split(".")[0], "")
        if intro and intro not in context:
            context = (intro + " " + context).strip()
        parts.append({
            "qno": r["qno"], "text": r["text"], "marks": r["marks"],
            "context": context, "options": r["options"],
        })
    return parts


QUESTION_START_RE = re.compile(r"\n\s*(\d)\s*(\d)\s*\n(?!\s*\.)")


def question_intros(full):
    """{'03': 'This question is about photosynthesis. ...'}

    The text between a question's own marker ("0 3") and its first part marker
    introduces every part of that question.
    """
    out = {}
    for m in QUESTION_START_RE.finditer(full):
        qno = f"{m.group(1)}{m.group(2)}"
        if qno in out or qno == "00":
            continue
        nxt = PART_RE.search(full, m.end())
        if not nxt:
            continue
        intro = tidy(full[m.end():nxt.start()])
        if 15 < len(intro) < 600:
            out[qno] = intro
    return out


def strip_front_matter(t):
    """Cut the cover page off the stem of the very first part."""
    for marker in ["Answer all questions in the spaces provided",
                   "Answer all questions", "you must have", "Instructions"]:
        idx = t.rfind(marker)
        if idx != -1:
            t = t[idx + len(marker):]
            break
    return t


QNUM_LINE_RE = re.compile(r"^\s*\d\s*\d\s*\.?\s*\d?\s*$")


def extract_options(after_tick):
    """Split the text following 'Tick one box' into the option list and the
    remainder (the shared stem introducing the next part).

    The options always end at the next question or part marker ("0 2", "0 2 . 1"),
    so those lines are used as the terminator rather than being stripped first.
    """
    lines = after_tick.split("\n")
    opts, rest_at = [], len(lines)
    for i, raw_line in enumerate(lines):
        stripped = raw_line.strip()
        if QNUM_LINE_RE.fullmatch(stripped) and stripped:
            rest_at = i
            break
        line = denoise(stripped).strip()
        if not line or re.fullmatch(r"[\W_]+", line):
            continue
        if re.match(r"(do not write|outside the|box\b|turn over|question \d)", line, re.I):
            continue
        if re.fullmatch(r"\d{1,3}", line):     # page number
            continue
        if MARKS_RE.search(line):
            rest_at = i
            break
        if len(line) > 110 or len(opts) >= 6:
            rest_at = i
            break
        opts.append(line)
    return opts, "\n".join(lines[rest_at:])


def drop_stray_options(ctx):
    """Remove leftover tick-box option text that leaked into a stem."""
    ctx = re.sub(r"^(Tick\s*\(?\s*\)?\s*\w+\s*box\.?\s*)", "", ctx, flags=re.I)
    return ctx.strip()


# ===============================================================
# FIGURES
# ===============================================================
def extract_figures(qp_path, out_dir, prefix, dpi=170):
    """Crop every 'Figure n' and 'Table n' region to a PNG.

    Returns {'Figure 3': 'data/images/...png', 'Table 1': '...'}
    """
    os.makedirs(out_dir, exist_ok=True)
    doc = pymupdf.open(qp_path)
    found = {}
    for page in doc:
        words = page.get_text("words")
        caps = []
        for kind in ("Figure", "Table"):
            for r in page.search_for(kind + " "):
                near = [w for w in words if pymupdf.Rect(w[:4]).intersects(r + (0, -2, 70, 2))]
                txt = " ".join(w[4] for w in sorted(near, key=lambda w: w[0]))
                m = re.search(rf"{kind}\s*(\d+)", txt)
                # only treat it as a caption if it sits alone on its line
                if m and len(txt.strip()) < 24:
                    caps.append((r, f"{kind} {m.group(1)}"))
        if not caps:
            continue

        boxes = [pymupdf.Rect(d["rect"]) for d in page.get_drawings()]
        for img in page.get_images(full=True):
            boxes.extend(pymupdf.Rect(x) for x in page.get_image_rects(img[0]))
        try:
            for tab in page.find_tables().tables:
                boxes.append(pymupdf.Rect(tab.bbox))
        except Exception:
            pass
        boxes = [b for b in boxes if b.get_area() > 400 and b.width < page.rect.width * 0.98]
        if not boxes:
            continue

        caps.sort(key=lambda c: c[0].y0)
        for idx, (rect, key) in enumerate(caps):
            if key in found:
                continue
            top = rect.y1
            bottom = caps[idx + 1][0].y0 if idx + 1 < len(caps) else page.rect.y1
            region = [b for b in boxes if b.y0 >= top - 6 and b.y1 <= bottom + 6]
            if not region:
                continue
            clip = region[0]
            for b in region[1:]:
                clip |= b
            clip = (clip + (-10, -10, 10, 10)) & page.rect
            if clip.width < 50 or clip.height < 35:
                continue
            name = f"{prefix}-{key.lower().replace(' ', '')}.png"
            page.get_pixmap(clip=clip, dpi=dpi).save(os.path.join(out_dir, name))
            found[key] = f"data/images/{name}"
    doc.close()
    return found


# ===============================================================
# BUILD
# ===============================================================
def build(qp, ms, out, images_dir, label, prefix, tier="H", level="gcse", subject="biology"):
    scheme = parse_mark_scheme(ms)
    parts = parse_question_paper(qp)
    figures = extract_figures(qp, images_dir, prefix)
    print(f"  mark scheme rows: {len(scheme)}   paper parts: {len(parts)}   figures: {len(figures)}")

    questions, skipped = [], []
    for p in parts:
        sm = scheme.get(p["qno"])
        if not sm:
            skipped.append(p["qno"] + " (no mark scheme row)")
            continue
        topic = SPEC_TO_TOPIC.get(".".join((sm["spec"] or "").split(".")[:2]))
        if not topic:
            skipped.append(p["qno"] + " (no spec ref)")
            continue

        marks = p["marks"] or sm["marks"] or 1
        stem = p["context"]
        text = (stem + " " + p["text"]).strip() if stem else p["text"]
        text = re.sub(r"\s{2,}", " ", text)

        answer = sm["answer"]
        if sm["extra"]:
            answer += "\n(examiner note: " + sm["extra"] + ")"

        q = {
            "id": f"{prefix}-{p['qno'].replace('.', '-')}",
            "level": level, "subject": subject, "topic": topic, "tier": tier,
            "marks": marks,
            "type": question_type(p, marks),
            "text": text,
            "answer": answer,
            "source": f"{label} Q{p['qno']}",
        }
        if p["options"]:
            q["options"] = p["options"]
        imgs = figures_for(text, figures)
        if imgs:
            q["image"] = imgs[0]
            if len(imgs) > 1:
                q["images"] = imgs
        questions.append(q)

    if skipped:
        print(f"  skipped {len(skipped)}: {', '.join(skipped)}")

    header = (
        f"// AUTO-GENERATED from {label}\n"
        f"// Source PDFs: AQA question paper and mark scheme.\n"
        f"// Regenerate with: python3 tools/extract.py (see tools/README)\n"
        f"// Worth spot-checking a few by eye; the parser is good but not perfect.\n\n"
        "window.QUESTIONS = window.QUESTIONS || [];\n"
        "window.QUESTIONS.push(\n"
    )
    body = ",\n".join("  " + json.dumps(q, ensure_ascii=False, indent=2).replace("\n", "\n  ")
                      for q in questions)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(header + body + "\n);\n")
    print(f"  wrote {len(questions)} questions -> {out}")
    return questions


def question_type(p, marks):
    if p["options"]:
        return "mcq"
    if re.search(r"\bcalculat|\bwork out\b|give your answer", p["text"], re.I):
        return "calculation"
    if marks >= 5:
        return "extended"
    return "short"


def figures_for(text, figures):
    """All Figure/Table images this question refers to, in order of mention."""
    out = []
    for m in re.finditer(r"(Figure|Table)\s*(\d+)", text):
        key = f"{m.group(1)} {m.group(2)}"
        if key in figures and figures[key] not in out:
            out.append(figures[key])
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--qp", required=True)
    ap.add_argument("--ms", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--images", default="data/images")
    ap.add_argument("--label", required=True)
    ap.add_argument("--prefix", required=True)
    ap.add_argument("--tier", default="H")
    ap.add_argument("--subject", default="biology")
    a = ap.parse_args()
    print(a.label)
    build(a.qp, a.ms, a.out, a.images, a.label, a.prefix, tier=a.tier, subject=a.subject)
