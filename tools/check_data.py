#!/usr/bin/env python3
"""Sanity checks over the whole question bank.

    python3 tools/check_data.py

Reports anything that would look wrong on a printed worksheet: scrambled mark
schemes, stray figure references, mismatched multiple choice options, parts
wrongly marked as usable on their own, and so on. Exits non-zero if it finds
something worth fixing.
"""

import glob, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(pattern):
    """Read the data files through node, since they are JavaScript, not JSON."""
    items = []
    for path in sorted(glob.glob(os.path.join(ROOT, pattern))):
        script = (
            "global.window={};require(%s);"
            "process.stdout.write(JSON.stringify(window.QUESTIONS||[]));" % json.dumps(path)
        )
        try:
            out = subprocess.run(["node", "-e", script], capture_output=True,
                                 text=True, timeout=60)
            if out.returncode:
                print(f"  ! {os.path.basename(path)} did not load: {out.stderr.strip()[:120]}")
                continue
            items += [(os.path.basename(path), q) for q in json.loads(out.stdout)]
        except Exception as e:
            print(f"  ! could not read {os.path.basename(path)}: {e}")
    return items


def flat(entries):
    """(file, question, part-or-question) for every answerable item."""
    out = []
    for fname, q in entries:
        if q.get("parts"):
            for p in q["parts"]:
                out.append((fname, q, p))
        else:
            out.append((fname, q, q))
    return out


def load_subtopics():
    """{subtopic id: topic id} from data/subtopics.js."""
    path = os.path.join(ROOT, "data", "subtopics.js")
    if not os.path.exists(path):
        return {}
    script = ("global.window={};require(%s);"
              "process.stdout.write(JSON.stringify(window.SUBTOPICS||[]));" % json.dumps(path))
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, timeout=60)
    if out.returncode:
        return {}
    return {s["id"]: s["topic"] for s in json.loads(out.stdout)}


def main():
    subtopics = load_subtopics()
    entries = load("data/questions/*.js")
    if not entries:
        print("No question files found.")
        return 1
    items = flat(entries)
    tagged = sum(1 for _, q, p in items if p.get("subtopic") or q.get("subtopic"))
    print(f"{len(entries)} questions, {len(items)} answerable parts, "
          f"{tagged} tagged to a lesson, {len(subtopics)} sub-topics defined\n")

    problems = {}

    def flag(name, fname, qid, detail):
        problems.setdefault(name, []).append(f"{fname} {qid}: {detail}")

    ids = {}
    for fname, q in entries:
        if q["id"] in ids:
            flag("duplicate id", fname, q["id"], "also in " + ids[q["id"]])
        ids[q["id"]] = fname

    for fname, q, p in items:
        qid = q["id"] + (("/" + p.get("label", "")) if p is not q else "")
        text = p.get("text", "") or ""
        answer = p.get("answer", "") or ""

        if not text.strip():
            flag("empty question text", fname, qid, "")
        if not answer.strip():
            flag("empty answer", fname, qid, "")

        # Marking guidance belongs in its own field, not inside the answer.
        # Level of response schemes are exempt: their indicative content
        # legitimately contains these words.
        # A marking instruction starts its own line; "allow" inside a sentence
        # ("the joints allow the bones to move") is ordinary English.
        if fname.startswith("aqa-") and not answer.lstrip().startswith("Level ") and \
                re.search(r"(?:^|(?<=[.;])\s)(allow|ignore|do not accept)\b",
                          answer, re.I | re.M):
            flag("guidance inside answer", fname, qid, answer[:60])

        # a prohibition that got split reads as its opposite
        if re.search(r"^Do not\s*$", p.get("guidance", "") or "", re.M):
            flag("orphan 'Do not'", fname, qid, "")

        if re.search(r"(Figure|Table)\s*(\d+)\s+\1\s*\2", text):
            flag("duplicated caption", fname, qid, text[:60])
        if "cannot be reproduced" in text:
            flag("copyright placeholder left in", fname, qid, "")

        # a question that mentions a figure must actually carry one
        mentions = re.findall(r"(?:Figure|Table)\s*\d+", text)
        has_img = bool(p.get("images") or p.get("image") or
                       q.get("images") or q.get("image") or p.get("table") or p.get("graph"))
        if mentions and not has_img:
            flag("mentions a figure but has none", fname, qid, mentions[0])

        if p.get("type") == "mcq":
            opts = p.get("options") or []
            if len(opts) < 2:
                flag("multiple choice with too few options", fname, qid, str(opts))
            if any(len(o.strip()) < 1 for o in opts):
                flag("blank option", fname, qid, str(opts))

        marks = p.get("marks")
        if not isinstance(marks, int) or not 1 <= marks <= 10:
            flag("odd mark value", fname, qid, str(marks))

        if text and text[0].islower():
            flag("text starts mid-sentence", fname, qid, text[:50])

        if "Indicative content" in answer and not answer.lstrip().startswith("Level "):
            flag("garbled level of response scheme", fname, qid, answer[:50])

        # a sub-topic must exist and belong to the question's own topic
        sub = p.get("subtopic") or (None if p.get("topic") else q.get("subtopic"))
        if sub and subtopics:
            if sub not in subtopics:
                flag("unknown sub-topic", fname, qid, sub)
            else:
                owner = p.get("topic") or q.get("topic")
                if subtopics[sub] != owner:
                    flag("sub-topic in the wrong topic", fname, qid,
                         f"{sub} is in {subtopics[sub]}, not {owner}")

    # a standalone part must not depend on a figure shared with its siblings
    for fname, q in entries:
        if not q.get("parts"):
            continue
        if sum(p["marks"] for p in q["parts"]) != q["marks"]:
            flag("part marks do not sum to question marks", fname, q["id"], "")
        shared = set(q.get("images") or [])
        for p in q["parts"]:
            if p.get("standalone") and shared & set(p.get("images") or []):
                flag("standalone part needs a shared figure", fname, q["id"], p.get("label", ""))

    total = 0
    for name in sorted(problems):
        rows = problems[name]
        total += len(rows)
        print(f"{name}: {len(rows)}")
        for r in rows[:3]:
            print("    " + r)
        if len(rows) > 3:
            print(f"    ... and {len(rows) - 3} more")

    print()
    if total:
        print(f"{total} issues found.")
    else:
        print("No issues found.")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
