#!/usr/bin/env python3
"""Run the extractor over every past paper and write one .js file per paper.

    python3 tools/build_all.py "/path/to/Biology GCSE Higher"

Expects the AQA folder layout:
    <root>/Question Papers/AQA-8461nH-QP-<SESSION>.PDF
    <root>/Marking Scheme/AQA-8461nH-*MS-<SESSION>.PDF

Also prints a summary and rewrites the <script> list in index.html.
"""

import os, re, sys, glob
from extract import build

SESSION_NAMES = {
    "JUN18": "June 2018", "NOV20": "November 2020", "NOV21": "November 2021",
    "JUN22": "June 2022", "JUN23": "June 2023", "JUN24": "June 2024",
    "JUN25": "June 2025",
}


def key_of(filename):
    """('8461', '1H', 'JUN23') from any AQA filename."""
    m = re.search(r"AQA-(\d{4})(\dH?F?)-.*?(JUN\d\d|NOV\d\d)", filename, re.I)
    if not m:
        return None
    return (m.group(1), m.group(2).upper(), m.group(3).upper())


def main(root, out_dir="data/questions", images="data/images"):
    qps = glob.glob(os.path.join(root, "Question Papers", "*.PDF")) + \
          glob.glob(os.path.join(root, "Question Papers", "*.pdf"))
    mss = glob.glob(os.path.join(root, "Marking Scheme", "*.PDF")) + \
          glob.glob(os.path.join(root, "Marking Scheme", "*.pdf"))

    ms_by_key = {}
    for m in mss:
        k = key_of(os.path.basename(m))
        if k:
            ms_by_key[k] = m

    written, total_q, total_m = [], 0, 0
    for qp in sorted(qps):
        k = key_of(os.path.basename(qp))
        if not k:
            print(f"! could not parse name: {qp}")
            continue
        ms = ms_by_key.get(k)
        if not ms:
            print(f"! no mark scheme for {os.path.basename(qp)}")
            continue

        code, paper, session = k
        tier = "H" if paper.endswith("H") else ("F" if paper.endswith("F") else "both")
        pnum = paper[0]
        label = f"AQA GCSE Biology Paper {pnum}{tier} {SESSION_NAMES.get(session, session)}"
        prefix = f"aqa-{code}-{paper.lower()}-{session.lower()}"
        out = os.path.join(out_dir, prefix + ".js")

        print(label)
        try:
            qs = build(qp, ms, out, images, label, prefix, tier=tier)
        except Exception as e:
            print(f"  FAILED: {e}")
            continue
        written.append(prefix + ".js")
        total_q += len(qs)
        total_m += sum(q["marks"] for q in qs)

    print()
    print(f"{len(written)} papers, {total_q} questions, {total_m} marks total")
    update_index(written)


def update_index(files, index="index.html"):
    """Keep the <script src="data/questions/..."> list in sync."""
    if not os.path.exists(index):
        return
    html = open(index, encoding="utf-8").read()
    tags = "\n".join(f'<script src="data/questions/{f}"></script>' for f in sorted(files))
    block = re.search(r"(<!-- PAPERS:START -->)(.*?)(<!-- PAPERS:END -->)", html, re.S)
    if not block:
        print("  (no PAPERS:START marker in index.html, skipping)")
        return
    html = html[:block.start(2)] + "\n" + tags + "\n" + html[block.end(2):]
    open(index, "w", encoding="utf-8").write(html)
    print(f"  index.html updated with {len(files)} paper files")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
