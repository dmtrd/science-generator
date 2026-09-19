# Science Question Generator

A static site that builds timed worksheets, lesson starters and exam questions
from a bank of science questions. No server, no build step, no database: plain
HTML, CSS and JavaScript, so it runs on GitHub Pages for free.

**What is in the bank**

* **595 KS3 questions** for Years 7 to 9, written to the National Curriculum
  programme of study, covering biology, chemistry and physics. Text only, so
  they print cleanly and work as starters.
* **99 AQA GCSE Biology exam questions** (521 parts, 1127 marks) extracted from
  13 Higher tier past papers, 8461/1H and 8461/2H, June 2018 to June 2025. Each
  part carries its official mark scheme, the examiner's marking guidance, and
  the specification topic AQA assigned it.
* **710 keywords** with definitions across 52 topics, used by the starter mode.
* **181 diagrams, data tables and graphs** cropped from the past papers.

## Using it

Work down the five steps: year group, subject, exam and tier, topic, then what
to make.

**Timed worksheet** fills 5, 10, 15 or 20 minutes. It uses roughly a mark a
minute at GCSE and A level, and a slightly gentler rate at KS3. Answer lines and
boxes are sized to the marks.

**Keyword starter** is deliberately simple: match the key word to its
definition, fill in the gaps, and a few short recall questions. Starters never
include diagrams, tables or graphs, so they go straight on the board at the
start of a lesson.

**Random exam questions** gives whole exam questions with all their parts, so
nothing that the question depends on is missing.

"Show answers" reveals the mark scheme. Each answer is laid out point by point,
with AQA's marking guidance ("Allow...", "Ignore...", "Do not accept...")
underneath in smaller type rather than mixed into the answer. Level of response
questions show their level descriptors and indicative content.

"Print / Save as PDF" uses the browser print dialog; the mark scheme starts on a
new page. "Download Word" produces a real .docx with figures embedded.

## How questions are put together

A question in the bank is one of two shapes:

* a **single question**, which stands on its own, and
* a **multi-part exam question**, with a shared stem and parts (a), (b), (c).

Each part records whether it is `standalone`, meaning it still makes sense away
from the rest of its question. A part is not standalone if it needs a figure
that the other parts also use. Worksheets may use single standalone parts to hit
a time target exactly; exam mode always prints the whole question.

## Putting it on GitHub Pages

1. Push everything in this folder to a repository.
2. Settings, then Pages.
3. Source: Deploy from a branch, branch `main`, folder `/ (root)`. Save.
4. After a minute the site is live at
   `https://<your-username>.github.io/<repository-name>/`.

**Before making the repository public**, note that the GCSE question text and
mark schemes are AQA copyright. Using them with your own classes is normal
practice; publishing them on an open website is not the same thing. A private
repository avoids the issue (GitHub Pages on a private repository needs a paid
plan). The KS3 bank was written from scratch and carries no such restriction.

## Where the data lives

```
index.html              the page
app.js                  all the logic
style.css               styling, including the print stylesheet
data/structure.js       year groups, subjects, tiers and topic lists
data/keywords/*.js      keyword and definition lists for the starter mode
data/questions/ks3-*.js the KS3 bank, written by hand
data/questions/aqa-*.js the extracted past papers, one file per paper
data/images/*.png       figures cropped from the papers
tools/extract.py        turns one paper + mark scheme into a .js file
tools/build_all.py      runs the extractor over a folder of papers
tools/check_data.py     checks the whole bank for anything that would print wrong
```

Every data file is loaded by a `<script>` tag in `index.html`. The past paper
files sit between the `PAPERS:START` and `PAPERS:END` comments and are rewritten
by `tools/build_all.py`, so do not edit that block by hand.

## Checking the bank

```
python3 tools/check_data.py
```

It reads every data file and reports anything that would look wrong on a printed
worksheet: empty or scrambled mark schemes, marking guidance that leaked into an
answer, a question that mentions a figure it does not have, duplicated captions,
multiple choice questions with no options, part marks that do not add up, and
parts wrongly flagged as usable on their own. It should report no issues. Run it
after adding questions or re-extracting papers.

## Adding more past papers

Lay the PDFs out the way the AQA downloads come:

```
<folder>/Question Papers/AQA-84611H-QP-JUN23.PDF
<folder>/Marking Scheme/AQA-84611H-MS-JUN23.PDF
```

Then:

```
pip install pymupdf
PYTHONPATH=tools python3 tools/build_all.py "<folder>"
python3 tools/check_data.py
```

It matches each paper to its mark scheme by exam code, paper number and session,
writes one file per paper into `data/questions/`, crops the figures into
`data/images/`, and updates the script list in `index.html`.

Topic tagging is taken from the specification reference AQA prints in every mark
scheme row (for example `4.2.3.1`), so it is the exam board's own classification
rather than a guess.

To extract a single paper:

```
python3 tools/extract.py \
  --qp "path/to/QP.PDF" --ms "path/to/MS.PDF" \
  --out data/questions/my-paper.js \
  --label "AQA GCSE Biology Paper 1H June 2023" \
  --prefix aqa-8461-1h-jun23
```

### Other subjects

`tools/extract.py` has a `SPEC_TO_TOPIC` dictionary mapping specification
prefixes to topic ids. It currently covers GCSE Biology 8461. To add Chemistry
or Physics, add their prefixes there and pass `--subject chemistry`. The topic
ids already exist in `data/structure.js`.

## Writing questions by hand

Add a file under `data/questions/` and a `<script>` tag for it above the
`PAPERS:START` comment in `index.html`.

A single question:

```js
window.QUESTIONS = window.QUESTIONS || [];
window.QUESTIONS.push(
  {
    id: "my-q-001",              // unique
    level: "gcse",               // ks3 | gcse | alevel
    subject: "biology",
    topic: "gcse-bio-1",         // an id from data/structure.js
    tier: "H",                   // F | H | both  (GCSE only)
    marks: 3,
    type: "short",               // short | extended | calculation | mcq | graph-plot
    text: "Explain why ...",     // simple HTML allowed: <sub> <sup> <b> <br>
    answer: "First point (1)\nSecond point (1)",
    guidance: "Allow ...",       // optional marking guidance
    standalone: true,
    source: "Written in house",

    // all optional:
    options: ["A ...", "B ..."],           // for type: "mcq"
    images: ["data/images/my-diagram.png"],
    lines: 4,                               // override the answer lines
    table: { headers: ["x", "y"], rows: [[1, 2], [3, null]] },
    graph: {                                // drawn as SVG, prints cleanly
      xLabel: "Time (s)", yLabel: "Volume (cm³)",
      xMax: 120, yMax: 60, xStep: 20, yStep: 10,
      points: [[0, 0], [20, 22], [40, 38]], line: true
    }
  }
);
```

A multi-part question uses `parts` instead of `answer`, with the shared stem in
`text`:

```js
{
  id: "my-q-002", level: "gcse", subject: "biology", topic: "gcse-bio-2",
  tier: "H", marks: 5, text: "A student investigated enzyme activity.",
  images: ["data/images/apparatus.png"],
  parts: [
    { label: "(a)", text: "Name the independent variable.", marks: 1,
      type: "short", answer: "Temperature (1)", standalone: true },
    { label: "(b)", text: "Explain the shape of the curve.", marks: 4,
      type: "extended", answer: "...", standalone: false }
  ],
  source: "Written in house"
}
```

Set `graph.plot: false` with an empty `points` array to print a blank grid for
students to plot on.

Keywords for the starter mode:

```js
window.KEYWORDS = window.KEYWORDS || {};
window.KEYWORDS["gcse-bio-1"] = [
  { term: "Osmosis",
    definition: "Diffusion of water across a partially permeable membrane",
    sentence: "Water moves into root hair cells by ____." }   // sentence optional
];
```

The definition must not contain the term, since the starter asks students to
match one to the other, and `sentence` needs `____` where the term goes.

## Known limits

The extractor handles the AQA layout well, but it is reading PDFs, so it is
worth glancing over a generated worksheet before handing it out.

* A part whose mark scheme could not be read cleanly is dropped rather than
  printed, so a few parts from each paper are missing. This is deliberate: a
  wrong mark scheme is worse than a missing question.
* Subscripts sometimes flatten, so CO₂ can appear as CO2.
* A cropped figure occasionally carries a little surrounding whitespace.

Hand corrections belong in a file of your own, not in `data/questions/aqa-*.js`,
because re-running the extractor overwrites those.

## Offline use

The Word export loads a library from a CDN, so that one button needs an internet
connection. Everything else, including Print / Save as PDF, works offline.
