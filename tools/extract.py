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

import argparse, collections, json, os, re
import pymupdf


# AQA GCSE Biology 8461 spec prefix -> topic id in data/structure.js
SPEC_TO_TOPIC = {
    "4.1": "gcse-bio-1", "4.2": "gcse-bio-2", "4.3": "gcse-bio-3",
    "4.4": "gcse-bio-4", "4.5": "gcse-bio-5", "4.6": "gcse-bio-6",
    "4.7": "gcse-bio-7",
}

NOISE_PATTERNS = [
    r"Do not write outside the box", r"IB/[A-Z]{1,2}/ ?\S*\d+/\d+/\d+\w*",
    r"\*[a-zA-Z0-9]*\d+[a-zA-Z0-9]*\*",
    r"Turn over for (the )?next question", r"for (the )?next question", r"Question \d+ continues on the next page",
    r"Turn over [►▶>]*",
    r"END OF QUESTIONS", r"BLANK PAGE", r"Copyright information",
    r"DO NOT WRITE ON THIS PAGE", r"ANSWER IN THE SPACES PROVIDED",
    r"Extra space", r"For Examiner.s Use", r"Question Mark TOTAL",
    r"Tick \(?[^)]{0,4}\)? ?(one|two|three) box(es)?\.?",
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
                # The newlines in a cell carry the bullet structure, so they
                # are kept rather than flattened into spaces.
                cells = [(c or "").strip() for c in row]
                if not cells:
                    continue
                qcell = (cells[col["question"]] if col.get("question") is not None else "")
                qcell = qcell.replace("\n", " ").strip()
                if re.fullmatch(r"\d{2}\.\d", qcell):
                    current = qcell
                elif current is None:
                    continue
                # a row with an empty question cell continues the previous question
                rec = out.setdefault(current, {"answer": "", "extra": "", "marks": None,
                                               "spec": None, "levelled": False})
                rec["answer"] = (rec["answer"] + "\n" + pick(cells, col, "answer")).strip()
                rec["extra"] = (rec["extra"] + "\n" + pick(cells, col, "extra")).strip()

                mark_cell = pick(cells, col, "mark").replace("\n", " ")
                rng = re.search(r"(\d)\s*[-–—]\s*(\d)", mark_cell)
                if rng:
                    rec["levelled"] = True
                    rec["marks"] = max(rec["marks"] or 0, int(rng.group(2)))
                else:
                    m = re.search(r"\b([1-9])\b", mark_cell)
                    if m and not rec["marks"]:
                        rec["marks"] = int(m.group(1))

                sm = re.search(r"(\d\.\d(?:\.\d+)*)", pick(cells, col, "spec").replace("\n", " "))
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
    fallback = find_column_bounds(doc)
    if not fallback:
        doc.close()
        return {}

    out = {}
    for page in doc:
        words = [w for w in page.get_text("words") if w[4].strip()]
        if not words:
            continue
        # Column positions shift between pages (the level-of-response tables
        # have one column fewer), so read this page's own header when it has
        # one and only fall back to the document's first header if it does not.
        bounds = page_column_bounds(page, words) or fallback
        # question numbers sit in the leftmost column
        anchors = sorted(
            [w for w in words if QNO_RE.match(w[4].strip()) and in_column(w, bounds, "question")],
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
            rec["answer"] = (rec["answer"] + "\n" + column_text(band, bounds, "answer")).strip()
            rec["extra"] = (rec["extra"] + "\n" + column_text(band, bounds, "extra")).strip()

            mark_text = column_text(band, bounds, "mark").replace("\n", " ")
            rng = re.search(r"(\d)\s*[-–—‒]\s*(\d)", mark_text)
            if rng:
                rec["levelled"] = True
                rec["marks"] = max(rec["marks"] or 0, int(rng.group(2)))
            else:
                m = re.search(r"\b([1-9])\b", mark_text)
                if m and not rec["marks"]:
                    rec["marks"] = int(m.group(1))

            sm = re.search(r"(\d\.\d(?:\.\d+)*)", column_text(band, bounds, "spec").replace("\n", " "))
            if sm and not rec["spec"]:
                rec["spec"] = sm.group(1)
    doc.close()
    return out


def column_map(header):
    """Index of each column in a detected table's header row."""
    col = {}
    for i, h in enumerate(header):
        for key, needle in (("question", "question"), ("answer", "answer"),
                            ("extra", "extra"), ("mark", "mark")):
            if needle in h and key not in col:
                col[key] = i
                break
        else:
            if ("ao" in h or "spec" in h) and "spec" not in col:
                col["spec"] = i
    return col


def pick(cells, col, name):
    i = col.get(name)
    return cells[i] if i is not None and i < len(cells) else ""


HEADER_LABELS = [("question", "Question"), ("answer", "Answers"),
                 ("extra", "Extra"), ("mark", "Mark"), ("spec", "AO")]


def in_column(w, bounds, name):
    rng = column_range(bounds, name)
    return bool(rng) and rng[0] <= (w[0] + w[2]) / 2 < rng[1]


def header_spans(page, words):
    """The x extent of each column heading on a mark scheme page.

    Returns {"answer": (x0, x1), ...} or None if this page has no header row.
    """
    lines = {}
    for w in words:
        lines.setdefault(round(w[1] / 3), []).append(w)
    for row in lines.values():
        row = sorted(row, key=lambda w: w[0])
        spans, tokens = {}, [w[4].strip() for w in row]
        for i, token in enumerate(tokens):
            for key, label in HEADER_LABELS:
                if token == label and key not in spans:
                    x0, x1 = row[i][0], row[i][2]
                    # "Extra information" and "Spec. Ref." run over two words
                    if i + 1 < len(tokens) and tokens[i + 1] in ("information", "Ref.", "/"):
                        x1 = row[i + 1][2]
                    spans[key] = (x0, x1)
        if {"question", "answer", "mark"} <= set(spans):
            if "spec" not in spans:
                spans["spec"] = find_spec_heading(lines, row)
            if spans.get("spec") is None:
                spans.pop("spec", None)
            return spans
    return None


def find_spec_heading(lines, header_row):
    """Locate the "AO / Spec. Ref." heading, which AQA splits over two lines.

    It sits just above or below the rest of the header row, so the nearby
    lines are searched rather than only the header row itself.
    """
    y = min(w[1] for w in header_row)
    for key in sorted(lines):
        row = lines[key]
        if abs(min(w[1] for w in row) - y) > 14:
            continue
        for w in row:
            if w[4].strip() in ("AO", "AO1", "AO2", "AO3", "Spec.", "Spec"):
                return (w[0], w[2])
    return None


def bounds_from_spans(spans, page_width):
    """Cut positions between columns.

    The headings are centred over their columns, so a heading's own x is not
    the column edge. The edge is the middle of the gap between one heading and
    the next.
    """
    order = ["question", "answer", "extra", "mark", "spec"]
    present = [k for k in order if k in spans]
    cuts = {}
    for a, b in zip(present, present[1:]):
        cuts[a + "|" + b] = (spans[a][1] + spans[b][0]) / 2
    return {"present": present, "cuts": cuts, "width": page_width}


def find_column_bounds(doc):
    """Column layout taken from the first page in the document that has a header."""
    for page in doc:
        spans = header_spans(page, page.get_text("words"))
        if spans:
            return bounds_from_spans(spans, page.rect.x1)
    return None


def page_column_bounds(page, words):
    """Column layout from this page's own header, if it has one."""
    spans = header_spans(page, words)
    return bounds_from_spans(spans, page.rect.x1) if spans else None


def column_range(bounds, name):
    """(left, right) x limits of one column."""
    present = bounds["present"]
    if name not in present:
        return None
    i = present.index(name)
    lo = bounds["cuts"].get(present[i - 1] + "|" + name, 0) if i else 0
    hi = bounds["cuts"].get(name + "|" + present[i + 1], bounds["width"]) \
        if i + 1 < len(present) else bounds["width"]
    return lo, hi


def column_text(band, bounds, name):
    """Words of a row band that fall inside one column, as readable lines.

    Words are grouped into lines before being joined, otherwise a wrapped
    answer and the marking guidance beside it interleave into nonsense.
    """
    rng = column_range(bounds, name)
    if not rng:
        return ""
    lo, hi = rng
    sel = [w for w in band if lo <= (w[0] + w[2]) / 2 < hi]
    if not sel:
        return ""
    lines = {}
    for w in sel:
        lines.setdefault(round((w[1] + w[3]) / 2 / 6), []).append(w)
    out = []
    for key in sorted(lines):
        row = sorted(lines[key], key=lambda w: w[0])
        out.append(" ".join(w[4] for w in row).strip())
    return "\n".join(t for t in out if t)


def clean_answer(a):
    """Tidy spacing without losing the line breaks that carry the bullets."""
    a = (a or "").replace("\r", "\n")
    lines = [re.sub(r"[ \t]{2,}", " ", ln).strip() for ln in a.split("\n")]
    return "\n".join(ln for ln in lines if ln).strip()


# ===============================================================
# QUESTION PAPER
# ===============================================================
PART_RE = re.compile(r"\n\s*(\d)\s*(\d)\s*\n?\s*\.?\s*\n?\s*(\d)\s*\n")
MARKS_RE = re.compile(r"\[\s*(\d+)\s*marks?\s*\]")
TICKBOX_RE = re.compile(r"tick\s*\(?[^)\n]{0,4}\)?\s*(one|two|three)\s*box(es)?", re.I)


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
            "context": context, "options": r["options"], "intro": intro,
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


# Labels printed in the answer space of the previous part, such as
# "Ratio = 1 :" or the column headings of a table the student fills in.
# They sit between one part's marks tag and the next part, so without this
# they get read as the opening of the next question.
ANSWER_LABEL_RE = re.compile(
    r"^\s*(?:"
    r"[A-Z][A-Za-z0-9 ()/%°µ.,\-]{0,45}=\s*[^.?!]{0,25}"
    r"|Name of [a-z ]{1,30}"
    r"|(?:Explanation|Reason|Answer|Conclusion|Method|Prediction|Observation"
    r"|Similarities|Similarity|Differences|Difference|Advantages|Advantage"
    r"|Disadvantages|Disadvantage|Hazard|Risk|Variable|Units?)\b"
    r")\s*(?=[A-Z0-9]|$)"
)


DIAGRAM_LABELS_RE = re.compile(
    r"^\s*(?:"
    r"(?:[A-Z][a-z]{2,10} \d+ ){2,}"          # "Stage 1 Stage 2 Stage 3"
    r"|(?:\d+ to \d+ [a-z]+ ){1,4}"          # "0 to 6 hours 8 to 12 hours"
    r")")


def drop_answer_furniture(ctx):
    """Strip answer-space labels left over from the part before."""
    ctx = DIAGRAM_LABELS_RE.sub("", ctx)
    for _ in range(6):
        new = ANSWER_LABEL_RE.sub("", ctx, count=1).lstrip()
        if new == ctx:
            break
        ctx = new
    return ctx


def drop_stray_options(ctx):
    """Remove leftover tick-box option text that leaked into a stem."""
    ctx = re.sub(r"^(Tick\s*\(?\s*\)?\s*\w+\s*box\.?\s*)", "", ctx, flags=re.I)
    ctx = drop_answer_furniture(ctx)
    return ctx.strip()


# ===============================================================
# FIGURES
# ===============================================================
def text_stoppers(page, words):
    """Y positions where a figure crop must stop.

    A figure caption is followed by the artwork, but the next thing down the
    page is usually the next question part. Cropping past it would put someone
    else's question inside the image, so those lines are used as a hard floor.
    """
    lines = {}
    for w in words:
        lines.setdefault(round(w[1] / 3), []).append(w)
    ys = []
    for row in lines.values():
        row.sort(key=lambda w: w[0])
        text = " ".join(w[4] for w in row).strip()
        if not text:
            continue
        y = min(w[1] for w in row)
        # a part marker on its own, or one followed by the question it labels
        is_part_marker = re.match(r"^\d\s*\d\s*\.\s*\d\b", text) is not None \
            or re.fullmatch(r"\d\s*\d\s*\.?\s*\d?", text) is not None
        is_marks_tag = MARKS_RE.search(text) is not None
        letters = sum(c.isalpha() for c in text)
        is_body_text = len(text) > 55 and letters > len(text) * 0.6
        if is_part_marker or is_marks_tag or is_body_text:
            ys.append(y)
    return sorted(ys)


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


        stoppers = text_stoppers(page, words)
        caps.sort(key=lambda c: c[0].y0)
        for idx, (rect, key) in enumerate(caps):
            if key in found:
                continue
            top = rect.y1
            bottom = caps[idx + 1][0].y0 if idx + 1 < len(caps) else page.rect.y1
            # Stop the crop before the next question part or any run of body
            # text, so a figure never swallows the question printed under it.
            for y in stoppers:
                if top + 8 < y < bottom:
                    bottom = y
                    break
            region = [b for b in boxes if b.y0 >= top - 6 and b.y1 <= bottom - 2]
            if not region:
                continue
            clip = region[0]
            for b in region[1:]:
                clip |= b
            clip = (clip + (-10, -10, 10, 10)) & page.rect
            clip.y1 = min(clip.y1, bottom - 2)
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

# ===============================================================
# MARK SCHEME FORMATTING
# ===============================================================
CREDIT_WORDS = r"(allow|accept|ignore|do not accept|do not allow|reject|" \
               r"apply list principle|max \d|credit|award|note:|or reverse argument)"


# A line ending on one of these has been wrapped by the column, not finished,
# so the next line belongs to the same credit point.
CONTINUES_RE = re.compile(
    r"(?:\b(?:a|an|the|of|in|on|at|to|for|from|with|by|or|and|as|is|are|was|were|"
    r"than|that|which|when|into|onto|between|because|so|but|its|their|this|these|"
    r"more|less|not|no|any|all|each|per|about|over|under|up|down)\b|[/,(&+×-])\s*$",
    re.I)

SUB_BULLET_RE = re.compile(r"^(?:o|○|◦|-)\s+(?=\S)")
TOP_BULLET_RE = re.compile(r"^[•·\u2022]\s*")
LEAD_IN_RE = re.compile(r"^(any\s+\w+(?:\s+pairs?)?\s+from|any\s+\w+\s+of|"
                        r"marking\s+instructions?|level\s+of\s+response)\s*:?\s*$", re.I)
HEADING_RE = re.compile(r"^[A-Z][A-Za-z ]{2,28}(effects?|content|points?|answers?)\s*$")
LEVEL_NOTE_RE = re.compile(r"^(for level \d|to gain|max \d|students? (may|might))", re.I)


def parse_points(text):
    """Turn a mark scheme cell into structured blocks.

    AQA uses a real outline: bullets for credit-worthy points, "o" for the
    detail under a point, plain lines as sub-headings, and a lone "or" for an
    alternative wording of the point above. Flattening that into one paragraph
    is what made the mark schemes hard to read, so the outline is kept.

    Returns a list of {"type": lead|point|heading|note, "level": 0|1, "text": ...}
    """
    blocks = []
    pending_or = False
    # When the scheme uses bullets, an unbulleted line is that bullet wrapping
    # over. When it uses none, each line is a credit point in its own right.
    has_bullets = bool(re.search(r"^\s*[•·\u2022]", text or "", re.M))
    for raw in (text or "").split("\n"):
        line = raw.strip()
        if not line:
            continue

        if line.lower() in ("or", "or:"):
            pending_or = True
            continue

        sub = bool(SUB_BULLET_RE.match(line))
        top = bool(TOP_BULLET_RE.match(line))
        line = SUB_BULLET_RE.sub("", line) if sub else TOP_BULLET_RE.sub("", line)
        line = line.strip()
        if not line:
            continue

        if pending_or and blocks and blocks[-1]["type"] == "point":
            blocks[-1]["text"] += " or " + line
            pending_or = False
            continue
        pending_or = False

        if not (sub or top):
            if LEAD_IN_RE.match(line):
                blocks.append({"type": "lead", "text": line.rstrip(":") + ":"})
                continue
            if LEVEL_NOTE_RE.match(line):
                blocks.append({"type": "note", "text": line})
                continue
            if HEADING_RE.match(line) and len(line) < 32:
                blocks.append({"type": "heading", "text": line})
                continue
            # a plain lowercase line continues whatever came before it
            if has_bullets and blocks and blocks[-1]["type"] in ("point", "note") \
                    and line[0].islower():
                blocks[-1]["text"] += " " + line
                continue
            if blocks and blocks[-1]["type"] == "note" and line[0].islower():
                blocks[-1]["text"] += " " + line
                continue
            # a line the column cut mid-phrase carries on into this one
            if blocks and blocks[-1]["type"] == "point" \
                    and CONTINUES_RE.search(blocks[-1]["text"]):
                blocks[-1]["text"] += " " + line
                continue
            blocks.append({"type": "point", "level": 0, "text": line})
            continue

        blocks.append({"type": "point", "level": 1 if sub else 0, "text": line})

    blocks = join_calculation_lines(blocks)
    for b in blocks:
        if "text" in b:
            b["text"] = re.sub(r"\s{2,}", " ", b["text"]).strip()
    return [b for b in blocks if b.get("text")]


NUMERIC_LINE_RE = re.compile(r"^[\d\s.,()×x*/+=–—-]+$")


def join_calculation_lines(blocks):
    """Put a calculation back on one line.

    AQA prints working as a fraction, which comes out of the PDF as a column of
    fragments like "6.5 - 4.5", "4", "0.5". On their own they are meaningless,
    so consecutive numeric fragments are joined back together.
    """
    out = []
    for b in blocks:
        if (out and b["type"] == "point" and out[-1]["type"] == "point"
                and b.get("level") == out[-1].get("level")
                and NUMERIC_LINE_RE.fullmatch(b["text"])
                and NUMERIC_LINE_RE.fullmatch(out[-1]["text"])):
            out[-1]["text"] += "  " + b["text"]
            continue
        out.append(b)
    return out


def blocks_to_text(blocks):
    """Plain text version of the blocks, for the Word export and for checking."""
    out = []
    for b in blocks:
        if b["type"] == "point":
            out.append(("    - " if b.get("level") else "  - ") + b["text"])
        else:
            out.append(b["text"])
    return "\n".join(out)


def format_answer(rec):
    """Structured blocks for the mark scheme, plus a plain text fallback."""
    if rec.get("levelled"):
        return format_levelled(rec["answer"], rec["marks"])
    blocks = parse_points(rec["answer"])
    return blocks


def format_levelled(a, marks):
    """Level of response schemes: the bands, then the indicative content."""
    lines = [ln.strip() for ln in (a or "").split("\n") if ln.strip()]
    bands = {6: {"3": "5-6 marks", "2": "3-4 marks", "1": "1-2 marks"},
             4: {"2": "3-4 marks", "1": "1-2 marks"}}.get(marks, {})

    blocks, content_from = [], None
    for i, ln in enumerate(lines):
        if re.match(r"indicative content", ln, re.I):
            content_from = i + 1
            break
        lm = re.match(r"Level\s*(\d)\s*:?\s*(.*)", ln)
        if lm:
            band = bands.get(lm.group(1))
            label = f"Level {lm.group(1)}" + (f" ({band})" if band else "")
            blocks.append({"type": "band", "text": f"{label}: {lm.group(2)}".strip()})
        elif re.match(r"no relevant content", ln, re.I):
            blocks.append({"type": "band", "text": "Level 0 (0 marks): No relevant content."})
        elif blocks and blocks[-1]["type"] == "band" and ln[0].islower():
            blocks[-1]["text"] += " " + ln
        elif ln:
            blocks.append({"type": "note", "text": ln})

    if content_from is not None:
        blocks.append({"type": "heading", "text": "Indicative content"})
        blocks += parse_points("\n".join(lines[content_from:]))
    return blocks


def split_out_guidance(blocks):
    """Move marking guidance that ended up in the answers column.

    Some mark scheme layouts run the two columns together, so a whole block may
    turn out to be an instruction to the examiner rather than an answer point.
    """
    kept, moved = [], []
    for b in blocks:
        if b["type"] in ("point", "note") and \
                re.match(rf"{CREDIT_WORDS}\b", b["text"], re.I):
            moved.append(b["text"])
        else:
            kept.append(b)
    return kept, "\n".join(moved)


def format_guidance(extra):
    """The extra information column, one instruction per line."""
    g = re.sub(r"\s+", " ", extra or "").strip()
    if not g:
        return ""
    g = re.sub(r"\s*•\s*", " ", g)
    # "do not accept" must start a line as a whole: splitting it before
    # "accept" would turn a prohibition into an instruction to accept.
    g = re.sub(r"\bdo not (accept|allow|credit)\b",
               lambda m: "\x00do\x01not\x01" + m.group(1), g, flags=re.I)
    # start a new line each time a new marking instruction begins
    g = re.sub(rf"\s+(?={CREDIT_WORDS}\b)", "\n", g, flags=re.I)
    g = re.sub(r"\s*\x00", "\n", g).replace("\x01", " ")
    lines = [ln.strip() for ln in g.split("\n") if ln.strip()]
    seen, out = set(), []
    for ln in lines:
        key = ln.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(ln[0].upper() + ln[1:] if ln else ln)
    return "\n".join(out)


# ===============================================================
# BUILD
# ===============================================================
COPYRIGHT_NOTE = re.compile(
    r"(Figure|Table|Image)\s*\d*\s*(cannot be reproduced|has been removed|is not reproduced)[^.]*\.?",
    re.I)


def build(qp, ms, out, images_dir, label, prefix, tier="H", level="gcse", subject="biology"):
    scheme = parse_mark_scheme(ms)
    parts = parse_question_paper(qp)
    figures = extract_figures(qp, images_dir, prefix)
    print(f"  mark scheme rows: {len(scheme)}   paper parts: {len(parts)}   figures: {len(figures)}")

    # group the parts back under the question they belong to, so a question
    # that only makes sense as a whole is kept as a whole
    groups, order = {}, []
    for p in parts:
        if p["qno"] not in scheme:
            continue
        qid = p["qno"].split(".")[0]
        if qid not in groups:
            groups[qid] = []
            order.append(qid)
        groups[qid].append(p)

    questions, skipped = [], 0
    for qid in order:
        plist = groups[qid]
        built = build_question(qid, plist, scheme, figures, label, prefix, tier, level, subject)
        if built:
            questions.append(built)
        else:
            skipped += len(plist)

    if skipped:
        print(f"  skipped {skipped} parts with no usable topic tag")

    header = (
        f"// AUTO-GENERATED from {label}\n"
        f"// Source PDFs: AQA question paper and mark scheme.\n"
        f"// Regenerate with: PYTHONPATH=tools python3 tools/build_all.py <folder>\n"
        f"// Hand edits here are lost on the next run; put corrections in a file of your own.\n\n"
        "window.QUESTIONS = window.QUESTIONS || [];\n"
        "window.QUESTIONS.push(\n"
    )
    body = ",\n".join("  " + json.dumps(q, ensure_ascii=False, indent=2).replace("\n", "\n  ")
                      for q in questions)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(header + body + "\n);\n")
    nparts = sum(len(q.get("parts", [])) or 1 for q in questions)
    print(f"  wrote {len(questions)} questions ({nparts} parts) -> {out}")
    return questions


def build_question(qid, plist, scheme, figures, label, prefix, tier, level, subject):
    """One entry per original exam question, with its parts kept together."""
    specs = [scheme[p["qno"]].get("spec") for p in plist]
    topic = topic_from_specs(specs)
    if not topic:
        return None

    shared = shared_stem(plist)
    built_parts = []
    for p in plist:
        sm = scheme[p["qno"]]
        marks = p["marks"] or sm["marks"] or 1
        text = clean_stem(strip_prefix(p["context"], shared) + " " + p["text"])
        blocks = format_answer(sm)
        blocks, stray = split_out_guidance(blocks)
        entry = {
            "label": p["qno"],
            "text": text,
            "marks": marks,
            "type": question_type(p, marks),
            "answer": blocks_to_text(blocks),
            "answerBlocks": blocks,
        }
        # AQA prints a full specification reference on every mark scheme row
        # (for example 4.2.3.1). The first three parts of it are the sub-topic,
        # which is what a teacher plans lessons around.
        if sm.get("spec"):
            entry["spec"] = sm["spec"]
            bits = sm["spec"].split(".")
            if len(bits) >= 3:
                entry["subtopic"] = ".".join(bits[:3])
            # AQA questions often cross topics, so a part carries its own topic
            # rather than inheriting the one most of the question sits in.
            own = SPEC_TO_TOPIC.get(".".join(bits[:2]))
            if own and own != topic:
                entry["topic"] = own
        guidance = format_guidance((sm["extra"] + "\n" + stray).strip())
        if guidance:
            entry["guidance"] = guidance
        if p["options"]:
            entry["options"] = p["options"]
        imgs = figures_for(text, figures)
        if imgs:
            entry["images"] = imgs
        built_parts.append(entry)

    # Anything that would print as unanswerable is dropped rather than shipped.
    built_parts = [e for e in built_parts if part_is_usable(e, shared, figures)]
    if not built_parts:
        return None
    total = sum(e["marks"] for e in built_parts)

    # A part can be used on its own only if it does not depend on a figure or
    # table that the rest of the question also relies on.
    fig_use = collections.Counter()
    for e in built_parts:
        for img in e.get("images", []):
            fig_use[img] += 1
    shared_imgs = figures_for(shared, figures)
    for e in built_parts:
        own = e.get("images", [])
        depends_on_shared = any(i in shared_imgs for i in own)
        shares_with_siblings = any(fig_use[i] > 1 for i in own)
        e["standalone"] = not (depends_on_shared or shares_with_siblings)

    subtopics = [e["subtopic"] for e in built_parts if e.get("subtopic")]
    q = {
        "id": f"{prefix}-{qid}",
        "level": level, "subject": subject, "topic": topic, "tier": tier,
        "marks": total,
        "text": clean_stem(shared),
        "parts": built_parts,
        "source": f"{label} Q{int(qid)}",
    }
    if subtopics:
        # the question as a whole is tagged with the sub-topic most of its
        # parts belong to, for filtering whole exam questions
        q["subtopic"] = collections.Counter(subtopics).most_common(1)[0][0]
    simgs = figures_for(q["text"], figures)
    if simgs:
        q["images"] = simgs
    return q


def part_is_usable(entry, shared, figures):
    """Would this part make sense on a printed worksheet?"""
    blocks = entry.get("answerBlocks") or []
    if not blocks or not entry["answer"].strip():
        return False                      # no mark scheme to go with it
    kinds = [b["type"] for b in blocks]
    if "point" not in kinds and "band" not in kinds:
        # only headings or examiner notes survived, so there is no answer
        return False
    if any(b["type"] == "heading" and b["text"] == "Indicative content" for b in blocks) \
            and "band" not in kinds:
        # a level of response scheme whose bands did not come through cleanly
        return False
    text = entry["text"]
    if not text.strip() or text[0].islower():
        return False                      # lost the start of its stem
    # it refers to a figure or table that could not be extracted
    referenced = set(re.findall(r"(?:Figure|Table)\s*\d+", text))
    available = set()
    for key, path in figures.items():
        if path in (entry.get("images") or []):
            available.add(key)
    for key in figures:
        if key in shared:
            available.add(key)
    if referenced - available:
        return False
    return True


def shared_stem(plist):
    """The text that introduces the whole question.

    This is the paper's own wording between the question number and its first
    part, so it is the stem every part depends on.
    """
    if len(plist) < 2:
        return ""
    intro = (plist[0].get("intro") or "").strip()
    return intro if len(intro) > 20 else ""


def strip_prefix(text, prefix):
    if prefix and text.startswith(prefix):
        return text[len(prefix):].strip()
    return text


def clean_stem(t):
    """Final tidy of a question stem."""
    t = re.sub(r"\s+", " ", t or "").strip()
    t = COPYRIGHT_NOTE.sub("", t)
    # "Figure 3 Figure 3" -> "Figure 3", and the same for tables
    t = re.sub(r"\b(Figure|Table)\s*(\d+)(\s+\1\s*\2\b)+", r"\1 \2", t)
    # A caption printed above the artwork ("... the equipment. Figure 3 Describe
    # two ...") adds nothing once the figure itself is shown, so drop it.
    t = re.sub(r"(?<=[.!?])\s+(Figure|Table)\s*\d+\s+(?=[A-Z])", " ", t)
    t = re.sub(r"\s+(Figure|Table)\s*\d+\s*$", "", t)
    # a caption immediately followed by a stray number: "Figure 9 0 to 6 hours"
    t = re.sub(r"\b(Figure|Table)\s*(\d+)\s+(?=\d+\s+to\s+\d)", r"\1 \2: ", t)
    # "Table 6 is repeated below." adds nothing once the table is printed
    t = re.sub(r"\b(Figure|Table)\s*\d+\s*is repeated below\.?", "", t, flags=re.I)
    t = re.sub(r"\s{2,}", " ", t).strip(" ,;:")
    if t and not t.endswith((".", "?", "!", ":")):
        t += "."
    return t


def question_type(p, marks):
    if p["options"]:
        return "mcq"
    if re.search(r"\bcalculat|\bwork out\b|give your answer", p["text"], re.I):
        return "calculation"
    if marks >= 5:
        return "extended"
    return "short"


def figures_for(text, figures):
    """All Figure/Table images this text refers to, in order of mention."""
    out = []
    for m in re.finditer(r"(Figure|Table)\s*(\d+)", text or ""):
        key = f"{m.group(1)} {m.group(2)}"
        if key in figures and figures[key] not in out:
            out.append(figures[key])
    return out


def topic_from_specs(specs):
    counts = {}
    for s in specs:
        if not s:
            continue
        topic = SPEC_TO_TOPIC.get(".".join(s.split(".")[:2]))
        if topic:
            counts[topic] = counts.get(topic, 0) + 1
    return max(counts, key=counts.get) if counts else None


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
