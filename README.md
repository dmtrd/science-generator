# Science Question Generator

A static site that builds timed worksheets, keyword starters and random exam
questions from a bank of AQA past paper questions. No server, no build step, no
database: it is plain HTML, CSS and JavaScript, so it runs from GitHub Pages
for free.

Current bank: **568 questions (1240 marks)** extracted from 13 AQA GCSE Biology
Higher tier papers (8461/1H and 8461/2H, June 2018 to June 2025), each tagged to
a specification topic and paired with its official mark scheme.

## Using it

Open the site and work down the five steps: year group, subject, exam and tier,
topic, then what to make.

* **Timed worksheet** picks questions to fill 5, 10, 15 or 20 minutes, using the
  usual rule of about a mark a minute. Answer lines and boxes are sized to the
  marks.
* **Keyword starter** builds a match-the-definition task, a fill-the-gaps task
  and a few quick questions from the keyword list for the chosen topics.
* **Random exam questions** pulls one to five questions straight from the bank.

"Show answers" reveals the mark scheme, which prints on its own page.
"Print / Save as PDF" uses the browser print dialog. "Download Word" produces a
real .docx with the diagrams, tables and graphs embedded.

Diagrams, data tables and graphs from the original papers are cropped as images
and appear on screen, in the PDF and in the Word file.

## Putting it on GitHub Pages

1. Create a repository and push everything in this folder to it.
2. In the repository go to **Settings → Pages**.
3. Under "Build and deployment", set Source to **Deploy from a branch**, branch
   `main`, folder `/ (root)`, and save.
4. After a minute the site is live at
   `https://<your-username>.github.io/<repository-name>/`.

Nothing else is needed. The whole site is static files.

**Before you make the repository public**, note that the question text and mark
schemes are AQA copyright. Using them with your own classes is normal practice,
but publishing them on an open website is a different matter. Two safer options
are to make the repository private (GitHub Pages on a private repository needs a
paid plan), or to keep the repository public but leave the question data out of
it and load it from a private source.

## Where the data lives

```
index.html            the page itself
app.js                all the logic
style.css             styling, including the print stylesheet
data/structure.js     year groups, subjects, tiers and the topic lists
data/keywords/*.js    keyword and definition lists, used by the starter mode
data/questions/*.js   the question bank, one file per past paper
data/images/*.png     diagrams, tables and graphs cropped from the papers
tools/extract.py      turns a question paper + mark scheme PDF into a .js file
tools/build_all.py    runs the extractor over a whole folder of papers
```

Every data file is loaded by a `<script>` tag in `index.html`. The past paper
files sit between the `PAPERS:START` and `PAPERS:END` comments and are rewritten
automatically by `tools/build_all.py`, so do not edit that block by hand.

## Adding more past papers

Put the PDFs in a folder laid out the way the AQA downloads come:

```
<folder>/Question Papers/AQA-84611H-QP-JUN23.PDF
<folder>/Marking Scheme/AQA-84611H-MS-JUN23.PDF
```

Then run:

```
pip install pymupdf
cd <this project>
PYTHONPATH=tools python3 tools/build_all.py "<folder>"
```

It matches each paper to its mark scheme by exam code, paper number and session,
writes one `.js` file per paper into `data/questions/`, crops the figures into
`data/images/`, and updates the script list in `index.html`.

The extractor reads the specification reference that AQA prints in every mark
scheme row (for example `4.2.3.1`) and uses it to tag the question to a topic,
so topic tagging is taken from AQA rather than guessed.

To extract a single paper instead:

```
python3 tools/extract.py \
  --qp "path/to/QP.PDF" --ms "path/to/MS.PDF" \
  --out data/questions/my-paper.js \
  --label "AQA GCSE Biology Paper 1H June 2023" \
  --prefix aqa-8461-1h-jun23
```

### Extending to other subjects

`tools/extract.py` has a `SPEC_TO_TOPIC` dictionary mapping specification
prefixes to topic ids. It currently covers GCSE Biology 8461. To add Chemistry
or Physics, add their prefixes there and pass `--subject chemistry` (the topic
ids already exist in `data/structure.js`).

## Writing questions by hand

Add a file under `data/questions/` and a `<script>` tag for it above the
`PAPERS:START` comment in `index.html`. The format is:

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
    source: "Written in house",

    // all optional:
    options: ["A ...", "B ..."],           // for type: "mcq"
    image: "data/images/my-diagram.png",
    images: ["data/images/a.png", "data/images/b.png"],
    lines: 4,                               // override the number of answer lines
    table: { headers: ["x", "y"], rows: [[1, 2], [3, null]] },
    graph: {                                // drawn as SVG, prints cleanly
      xLabel: "Time (s)", yLabel: "Volume (cm³)",
      xMax: 120, yMax: 60, xStep: 20, yStep: 10,
      points: [[0, 0], [20, 22], [40, 38]], line: true
    },
    parts: [                                // for multi-part questions
      { label: "(a)", text: "...", marks: 2, answer: "..." }
    ]
  }
);
```

Set `graph.plot: false` with an empty `points` array to print a blank grid for
students to plot on.

Keywords for the starter mode go in `data/keywords/`:

```js
window.KEYWORDS = window.KEYWORDS || {};
window.KEYWORDS["gcse-bio-1"] = [
  { term: "Osmosis",
    definition: "Diffusion of water across a partially permeable membrane",
    sentence: "Water moves into root hair cells by ____." }   // sentence optional
];
```

## Known limits of the extraction

The extractor is good but not perfect, so it is worth glancing over a generated
worksheet before handing it out.

* A few questions lose part of their shared introduction, usually where a paper
  splits a long stem across a page break.
* Equations and formulae with subscripts sometimes come through with the
  subscripts flattened, so `CO₂` can appear as `CO2`.
* Around eight parts across the thirteen papers were skipped because their mark
  scheme row could not be matched.
* Cropped figures occasionally include a little surrounding whitespace.

Any question can be corrected by hand: find it by its `id` in the relevant file
under `data/questions/`. Re-running the extractor overwrites those files, so keep
hand corrections in a separate file of your own instead.

## Offline use

The Word export loads a library from a CDN, so that one button needs an internet
connection. Everything else, including Print / Save as PDF, works offline.
