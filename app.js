/* ============================================================
   Science Question Generator: app logic
   Data comes from window.STRUCTURE, window.QUESTIONS, window.KEYWORDS
   ============================================================ */

(function () {
  "use strict";

  const S = window.STRUCTURE;
  const QUESTIONS = window.QUESTIONS || [];
  const KEYWORDS = window.KEYWORDS || {};

  // ---------- state ----------
  const state = {
    year: null,       // "7".."13"
    level: null,      // ks3 | gcse | alevel
    subject: null,    // biology | chemistry | physics | combined | science
    tier: null,       // F | H (GCSE only)
    topics: [],       // topic ids
    mode: null,       // worksheet | starter | exam
    minutes: 10,
    count: 3,
    result: null,     // last generated output
    showAnswers: false
  };

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sum = (arr, f) => arr.reduce((t, x) => t + f(x), 0);

  // ---------- step 1: year ----------
  function renderYears() {
    const box = $("#year-chips");
    box.innerHTML = "";
    S.yearGroups.forEach((y) => {
      const b = el("button", "chip", y.label);
      b.type = "button";
      b.onclick = () => {
        state.year = y.id;
        state.level = y.level;
        state.subject = null;
        state.tier = null;
        state.topics = [];
        mark(box, b);
        renderSubjects();
        renderExam();
        renderTopics();
        refresh();
      };
      box.appendChild(b);
    });
    $("#step-year").classList.add("active");
  }

  function mark(container, chosen) {
    container.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
    if (chosen) chosen.classList.add("selected");
  }

  // ---------- step 2: subject ----------
  function renderSubjects() {
    const box = $("#subject-chips");
    box.innerHTML = "";
    if (!state.level) return;
    S.subjects[state.level].forEach((s) => {
      const b = el("button", "chip", s.label);
      b.type = "button";
      b.onclick = () => {
        state.subject = s.id;
        state.topics = [];
        mark(box, b);
        renderTopics();
        refresh();
      };
      box.appendChild(b);
    });
  }

  // ---------- step 3: exam and tier ----------
  function renderExam() {
    const lvl = S.levels[state.level];
    $("#level-label").textContent = lvl ? lvl.label : "";
    const box = $("#tier-chips");
    box.innerHTML = "";
    if (lvl && lvl.hasTiers) {
      S.tiers.forEach((t) => {
        const b = el("button", "chip", t.label);
        b.type = "button";
        b.onclick = () => {
          state.tier = t.id;
          mark(box, b);
          renderTopics();
          refresh();
        };
        box.appendChild(b);
      });
    } else {
      state.tier = null;
      box.appendChild(el("span", "hint", "No tiers at this level."));
    }
  }

  // ---------- step 4: topics ----------
  function topicsForSelection() {
    if (!state.level || !state.subject) return [];
    return S.topics.filter((t) => {
      if (t.level !== state.level) return false;
      if (state.subject === "science") return true;                // KS3 all
      if (state.subject === "combined") return t.combined !== false; // GCSE Trilogy
      return t.subject === state.subject;
    }).sort((a, b) => {
      // KS3: this year group's typical topics first
      if (state.level === "ks3") {
        const ay = a.year === state.year ? 0 : 1;
        const by = b.year === state.year ? 0 : 1;
        if (ay !== by) return ay - by;
      }
      if (state.level === "alevel") {
        const ay = a.year === state.year ? 0 : 1;
        const by = b.year === state.year ? 0 : 1;
        if (ay !== by) return ay - by;
      }
      return 0;
    });
  }

  function questionPool(topicIds) {
    return QUESTIONS.filter((q) => {
      if (q.level !== state.level) return false;
      if (!topicIds.includes(q.topic)) return false;
      if (state.level === "gcse") {
        if (state.subject === "combined" && q.combined === false) return false;
        if (state.tier && q.tier && q.tier !== "both" && q.tier !== state.tier) return false;
      }
      return true;
    });
  }

  function renderTopics() {
    const list = $("#topic-list");
    list.innerHTML = "";
    const topics = topicsForSelection();
    topics.forEach((t) => {
      const lab = el("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = t.id;
      cb.checked = state.topics.includes(t.id);
      cb.onchange = () => {
        if (cb.checked) state.topics.push(t.id);
        else state.topics = state.topics.filter((x) => x !== t.id);
        refresh();
      };
      lab.appendChild(cb);
      const subjTag = (state.subject === "science" || state.subject === "combined")
        ? `<span class="count">${cap(t.subject)}: </span>` : "";
      lab.appendChild(el("span", null, subjTag + t.label));
      const nQ = questionPool([t.id]).length;
      const nK = (KEYWORDS[t.id] || []).length;
      let badge = `${nQ} Q / ${nK} kw`;
      if (t.year && (state.level === "ks3" || state.level === "alevel")) badge = `Y${t.year} · ` + badge;
      lab.appendChild(el("span", "badge", badge));
      list.appendChild(lab);
    });
    if (!topics.length) list.appendChild(el("p", "hint", "Choose a year group and subject first."));
  }

  $("#topics-all").onclick = () => {
    state.topics = topicsForSelection().map((t) => t.id);
    renderTopics(); refresh();
  };
  $("#topics-none").onclick = () => { state.topics = []; renderTopics(); refresh(); };

  // ---------- step 5: mode ----------
  $("#mode-chips").querySelectorAll(".chip").forEach((b) => {
    b.onclick = () => {
      state.mode = b.dataset.mode;
      mark($("#mode-chips"), b);
      ["worksheet", "starter", "exam"].forEach((m) => { $("#opt-" + m).hidden = m !== state.mode; });
      refresh();
    };
  });
  $("#minute-chips").querySelectorAll(".chip").forEach((b) => {
    b.onclick = () => { state.minutes = +b.dataset.minutes; mark($("#minute-chips"), b); refresh(); };
  });
  $("#count-chips").querySelectorAll(".chip").forEach((b) => {
    b.onclick = () => { state.count = +b.dataset.count; mark($("#count-chips"), b); refresh(); };
  });

  // ---------- enable/disable steps ----------
  function refresh() {
    const lvl = S.levels[state.level];
    const tierOk = !lvl || !lvl.hasTiers || state.tier;
    setActive("#step-subject", !!state.level);
    setActive("#step-exam", !!state.subject);
    setActive("#step-topic", !!state.subject && tierOk);
    setActive("#step-mode", state.topics.length > 0);

    const ready = state.topics.length > 0 && state.mode && tierOk;
    $("#generate").disabled = !ready;

    const info = $("#pool-info");
    info.className = "hint";
    if (state.topics.length) {
      const pool = questionPool(state.topics);
      const marks = sum(pool, (q) => q.marks);
      const kws = state.topics.reduce((n, t) => n + (KEYWORDS[t] || []).length, 0);
      info.textContent = `${pool.length} questions (${marks} marks) and ${kws} keywords available.`;
      if (state.mode === "worksheet" && marks < targetMarks()) {
        info.className = "hint warn";
        info.textContent += ` Not enough for ${state.minutes} minutes yet; add more to data/questions.`;
      }
      if (state.mode === "starter" && kws < 4) {
        info.className = "hint warn";
        info.textContent += " Add keywords for this topic in data/keywords.";
      }
    } else info.textContent = "";
  }
  function setActive(sel, on) { $(sel).classList.toggle("active", !!on); }

  function targetMarks() {
    const mpm = (S.levels[state.level] || {}).minutesPerMark || 1;
    return Math.round(state.minutes / mpm);
  }

  // ---------- generation ----------
  $("#generate").onclick = () => { generate(); };
  $("#btn-shuffle").onclick = () => { generate(); };
  $("#btn-answers").onclick = () => {
    state.showAnswers = !state.showAnswers;
    $("#btn-answers").textContent = state.showAnswers ? "Hide answers" : "Show answers";
    const a = $("#paper .answers");
    if (a) a.hidden = !state.showAnswers;
  };
  $("#btn-print").onclick = () => window.print();
  $("#btn-word").onclick = () => exportWord();

  function generate() {
    const pool = shuffle(questionPool(state.topics));
    let result;
    if (state.mode === "worksheet") result = buildWorksheet(pool);
    else if (state.mode === "exam") result = buildExam(pool);
    else result = buildStarter(pool);
    state.result = result;
    renderPaper(result);
    $("#output-section").hidden = false;
    $("#output-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function headerInfo() {
    const yr = S.yearGroups.find((y) => y.id === state.year);
    const subj = S.subjects[state.level].find((s) => s.id === state.subject);
    const lvl = S.levels[state.level];
    const tier = state.tier ? S.tiers.find((t) => t.id === state.tier).label + " tier" : null;
    const topics = state.topics.map((id) => S.topics.find((t) => t.id === id).label);
    return {
      year: yr.label, subject: subj.label, level: lvl.label, tier,
      topics, topicText: topics.join("; ")
    };
  }

  // Pick questions to hit a marks target. Greedy with a second pass for small fillers.
  function pickToMarks(pool, target) {
    const chosen = [];
    let total = 0;
    for (const q of pool) {
      if (total + q.marks <= target) { chosen.push(q); total += q.marks; }
    }
    // second pass: try small questions we skipped
    for (const q of pool) {
      if (chosen.includes(q)) continue;
      if (total + q.marks <= target) { chosen.push(q); total += q.marks; }
    }
    // if we are well under, allow one overshoot of up to 2 marks
    if (total < target * 0.8) {
      const extra = pool.find((q) => !chosen.includes(q) && q.marks <= target - total + 2);
      if (extra) { chosen.push(extra); total += extra.marks; }
    }
    // order: short questions first, extended last
    chosen.sort((a, b) => a.marks - b.marks);
    return { questions: chosen, totalMarks: total };
  }

  function buildWorksheet(pool) {
    const target = targetMarks();
    const picked = pickToMarks(pool, target);
    const h = headerInfo();
    return {
      kind: "worksheet",
      title: `${h.subject}: ${state.minutes} minute worksheet`,
      subtitle: `${h.year} · ${h.level}${h.tier ? " · " + h.tier : ""}`,
      topicText: h.topicText,
      minutes: state.minutes,
      targetMarks: target,
      questions: picked.questions,
      totalMarks: picked.totalMarks
    };
  }

  function buildExam(pool) {
    const h = headerInfo();
    const qs = pool.slice(0, state.count).sort((a, b) => a.marks - b.marks);
    return {
      kind: "exam",
      title: `${h.subject}: exam questions`,
      subtitle: `${h.year} · ${h.level}${h.tier ? " · " + h.tier : ""}`,
      topicText: h.topicText,
      questions: qs,
      totalMarks: sum(qs, (q) => q.marks)
    };
  }

  function buildStarter(pool) {
    const h = headerInfo();
    let kws = [];
    state.topics.forEach((t) => { kws = kws.concat(KEYWORDS[t] || []); });
    kws = shuffle(kws);
    const matchSet = kws.slice(0, 6);
    const gapSet = kws.slice(6, 10).length >= 3 ? kws.slice(6, 10) : kws.slice(0, 4);
    const quick = pool.filter((q) => q.marks <= 2 && !q.parts).slice(0, 3);
    return {
      kind: "starter",
      title: `${h.subject}: starter`,
      subtitle: `${h.year} · ${h.level}${h.tier ? " · " + h.tier : ""}`,
      topicText: h.topicText,
      match: $("#st-match").checked ? matchSet : [],
      gaps: $("#st-gaps").checked ? gapSet : [],
      quick: $("#st-quick").checked ? quick : [],
      questions: $("#st-quick").checked ? quick : [],
      totalMarks: 0
    };
  }

  // ---------- rendering ----------
  function renderPaper(r) {
    const paper = $("#paper");
    paper.innerHTML = "";
    paper.appendChild(el("h1", null, esc(r.title)));
    paper.appendChild(el("div", "meta", esc(r.subtitle) + " · Topics: " + esc(r.topicText)));
    paper.appendChild(el("div", "name-line", "<span>Name:</span><span>Class:</span><span>Date:</span>"));

    if (r.kind === "worksheet") {
      paper.appendChild(el("div", "summary",
        `Time: <b>${r.minutes} minutes</b> &nbsp;·&nbsp; Total marks: <b>${r.totalMarks}</b>` +
        (r.totalMarks < r.targetMarks * 0.8 ? ` <i>(only ${r.totalMarks} marks of questions available for this selection)</i>` : "")));
    }
    if (r.kind === "exam") {
      paper.appendChild(el("div", "summary", `Total marks: <b>${r.totalMarks}</b>`));
    }

    if (r.kind === "starter") renderStarter(paper, r);
    else r.questions.forEach((q, i) => paper.appendChild(renderQuestion(q, i + 1)));

    if (!r.questions.length && r.kind !== "starter") {
      paper.appendChild(el("p", "hint warn", "No questions match this selection yet. Add some to data/questions."));
    }

    // answers
    const ans = el("div", "answers");
    ans.appendChild(el("h2", null, "Answers and mark scheme"));
    if (r.kind === "starter") renderStarterAnswers(ans, r);
    r.questions.forEach((q, i) => {
      const num = r.kind === "starter" ? `Q${i + 1}` : `${i + 1}`;
      const d = el("div", "ans");
      d.appendChild(el("span", "q-num", num + ". "));
      d.appendChild(el("span", "ms", answerText(q)));
      ans.appendChild(d);
    });
    ans.hidden = !state.showAnswers;
    paper.appendChild(ans);
  }

  function answerText(q) {
    if (q.parts) return q.parts.map((p) => `${p.label} ${p.answer} [${p.marks}]`).join("\n");
    return `${q.answer} [${q.marks}]`;
  }

  function renderQuestion(q, n) {
    const wrap = el("div", "question");
    const head = el("div", "q-head");
    head.appendChild(el("div", "q-num", n + "."));
    const body = el("div", "q-body");
    if (q.text) body.appendChild(el("p", "q-text", q.text));
    (q.images || (q.image ? [q.image] : [])).forEach((src) => {
      const img = el("img", "q-image");
      img.src = src; img.alt = q.imageAlt || "diagram";
      body.appendChild(img);
    });
    if (q.table) body.appendChild(renderTable(q.table));
    if (q.graph) body.appendChild(renderGraph(q.graph));

    if (q.parts) {
      q.parts.forEach((p) => {
        const part = el("div", "part");
        part.appendChild(el("div", "p-label", p.label));
        const pb = el("div", "p-body");
        pb.appendChild(el("div", "q-text", p.text));
        if (p.image) { const im = el("img", "q-image"); im.src = p.image; pb.appendChild(im); }
        if (p.table) pb.appendChild(renderTable(p.table));
        if (p.graph) pb.appendChild(renderGraph(p.graph));
        pb.appendChild(answerSpace(p));
        pb.appendChild(el("div", "marks", `[${p.marks} mark${p.marks === 1 ? "" : "s"}]`));
        part.appendChild(pb);
        body.appendChild(part);
      });
    } else {
      body.appendChild(answerSpace(q));
      body.appendChild(el("div", "marks", `[${q.marks} mark${q.marks === 1 ? "" : "s"}]`));
    }
    if (q.source) body.appendChild(el("div", "source", esc(q.source)));
    head.appendChild(body);
    wrap.appendChild(head);
    return wrap;
  }

  function answerSpace(q) {
    if (q.type === "mcq" && q.options) {
      const ul = el("ul", "options");
      q.options.forEach((o) => ul.appendChild(el("li", null, o)));
      return ul;
    }
    if (q.type === "calculation") {
      const box = el("div", "answer-box" + (q.marks >= 4 ? " tall" : ""));
      return box;
    }
    if (q.type === "graph-plot" && q.graph) return el("div"); // graph already drawn
    const n = q.lines !== undefined ? q.lines : Math.max(1, q.marks >= 6 ? q.marks + 4 : q.marks);
    const box = el("div", "answer-lines");
    for (let i = 0; i < n; i++) box.appendChild(el("div", "line"));
    return box;
  }

  function renderTable(t) {
    const tbl = el("table", "data");
    if (t.headers) {
      const tr = el("tr");
      t.headers.forEach((h) => tr.appendChild(el("th", null, h)));
      tbl.appendChild(tr);
    }
    t.rows.forEach((r) => {
      const tr = el("tr");
      r.forEach((c) => tr.appendChild(el("td", null, c === null ? "&nbsp;" : c)));
      tbl.appendChild(tr);
    });
    return tbl;
  }

  // Draw a graph as SVG from a spec:
  // { xLabel, yLabel, xMax, yMax, xStep, yStep, points:[[x,y]], plot:true, line:true, width, height }
  function renderGraph(g) {
    const W = g.width || 440, H = g.height || 300;
    const m = { l: 56, r: 16, t: 14, b: 48 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const xMax = g.xMax, yMax = g.yMax;
    const xStep = g.xStep || niceStep(xMax), yStep = g.yStep || niceStep(yMax);
    const sx = (x) => m.l + (x / xMax) * pw;
    const sy = (y) => m.t + ph - (y / yMax) * ph;
    let s = `<svg class="graph" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>`;
    // minor grid (5 per major)
    for (let x = 0; x <= xMax + 1e-9; x += xStep / 5) s += `<line x1="${sx(x)}" y1="${m.t}" x2="${sx(x)}" y2="${m.t + ph}" stroke="#e6e6e6" stroke-width="0.6"/>`;
    for (let y = 0; y <= yMax + 1e-9; y += yStep / 5) s += `<line x1="${m.l}" y1="${sy(y)}" x2="${m.l + pw}" y2="${sy(y)}" stroke="#e6e6e6" stroke-width="0.6"/>`;
    // major grid and labels
    for (let x = 0; x <= xMax + 1e-9; x += xStep) {
      s += `<line x1="${sx(x)}" y1="${m.t}" x2="${sx(x)}" y2="${m.t + ph}" stroke="#bbb" stroke-width="0.9"/>`;
      s += `<text x="${sx(x)}" y="${m.t + ph + 16}" font-size="11" text-anchor="middle" fill="#222">${fmt(x)}</text>`;
    }
    for (let y = 0; y <= yMax + 1e-9; y += yStep) {
      s += `<line x1="${m.l}" y1="${sy(y)}" x2="${m.l + pw}" y2="${sy(y)}" stroke="#bbb" stroke-width="0.9"/>`;
      s += `<text x="${m.l - 6}" y="${sy(y) + 4}" font-size="11" text-anchor="end" fill="#222">${fmt(y)}</text>`;
    }
    // axes
    s += `<line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + ph}" stroke="#000" stroke-width="1.4"/>`;
    s += `<line x1="${m.l}" y1="${m.t + ph}" x2="${m.l + pw}" y2="${m.t + ph}" stroke="#000" stroke-width="1.4"/>`;
    s += `<text x="${m.l + pw / 2}" y="${H - 8}" font-size="12" text-anchor="middle" fill="#000">${esc(g.xLabel || "")}</text>`;
    s += `<text transform="translate(14 ${m.t + ph / 2}) rotate(-90)" font-size="12" text-anchor="middle" fill="#000">${esc(g.yLabel || "")}</text>`;
    // data
    if (g.points && g.plot !== false) {
      if (g.line) {
        const d = g.points.map((p, i) => (i ? "L" : "M") + sx(p[0]) + " " + sy(p[1])).join(" ");
        s += `<path d="${d}" fill="none" stroke="#1f3a93" stroke-width="1.6"/>`;
      }
      g.points.forEach((p) => {
        s += `<line x1="${sx(p[0]) - 4}" y1="${sy(p[1]) - 4}" x2="${sx(p[0]) + 4}" y2="${sy(p[1]) + 4}" stroke="#1f3a93" stroke-width="1.5"/>`;
        s += `<line x1="${sx(p[0]) - 4}" y1="${sy(p[1]) + 4}" x2="${sx(p[0]) + 4}" y2="${sy(p[1]) - 4}" stroke="#1f3a93" stroke-width="1.5"/>`;
      });
    }
    s += "</svg>";
    const holder = el("div");
    holder.innerHTML = s;
    return holder.firstChild;
  }
  function niceStep(max) {
    const raw = max / 5;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * p;
  }
  function fmt(v) { return Math.round(v * 1000) / 1000; }

  // ---------- starter rendering ----------
  function renderStarter(paper, r) {
    let n = 0;
    if (r.match.length) {
      n++;
      const b = el("div", "starter-block");
      b.appendChild(el("h3", null, `${n}. Match each key word to its definition`));
      const grid = el("div", "match");
      const defs = shuffle(r.match);
      r.match.forEach((k, i) => {
        grid.appendChild(el("div", "term", `${i + 1}. ${esc(k.term)}`));
        grid.appendChild(el("div", "def", `${String.fromCharCode(65 + i)}. ${esc(defs[i].definition)}`));
      });
      b.appendChild(grid);
      r._matchOrder = defs;
      paper.appendChild(b);
    }
    if (r.gaps.length) {
      n++;
      const b = el("div", "starter-block");
      b.appendChild(el("h3", null, `${n}. Fill in the gaps`));
      b.appendChild(el("div", "word-bank", "<b>Word bank:</b> " + shuffle(r.gaps).map((k) => esc(k.term)).join(" &nbsp;·&nbsp; ")));
      const ol = el("ol", "gaps");
      r.gaps.forEach((k) => {
        const sentence = k.sentence
          ? k.sentence.replace(/_{2,}/g, '<span class="gap"></span>')
          : `<span class="gap"></span> : ${esc(k.definition)}`;
        ol.appendChild(el("li", null, sentence));
      });
      b.appendChild(ol);
      paper.appendChild(b);
    }
    if (r.quick.length) {
      n++;
      const b = el("div", "starter-block");
      b.appendChild(el("h3", null, `${n}. Quick questions`));
      r.quick.forEach((q, i) => b.appendChild(renderQuestion(q, i + 1)));
      paper.appendChild(b);
    }
    if (!n) paper.appendChild(el("p", "hint warn", "Nothing to show: tick at least one starter activity, or add keywords for this topic."));
  }

  function renderStarterAnswers(ans, r) {
    if (r.match.length && r._matchOrder) {
      const d = el("div", "ans");
      d.appendChild(el("span", "q-num", "Match: "));
      d.appendChild(el("span", "ms", r.match.map((k, i) => {
        const letter = String.fromCharCode(65 + r._matchOrder.indexOf(k));
        return `${i + 1}${letter}`;
      }).join(", ")));
      ans.appendChild(d);
    }
    if (r.gaps.length) {
      const d = el("div", "ans");
      d.appendChild(el("span", "q-num", "Gaps: "));
      d.appendChild(el("span", "ms", r.gaps.map((k, i) => `${i + 1}. ${esc(k.term)}`).join("; ")));
      ans.appendChild(d);
    }
  }

  // ---------- Word export (.docx via docx library) ----------
  async function exportWord() {
    if (!window.docx) {
      alert("The Word library did not load (are you offline?). Use Print / Save as PDF instead.");
      return;
    }
    const r = state.result;
    if (!r) return;
    const D = window.docx;
    const P = (text, opts = {}) => new D.Paragraph({
      children: [new D.TextRun({ text, bold: !!opts.bold, size: opts.size || 22, italics: !!opts.italic })],
      spacing: { after: opts.after !== undefined ? opts.after : 120 },
      alignment: opts.right ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT
    });
    const children = [];
    children.push(P(r.title, { bold: true, size: 30 }));
    children.push(P(`${r.subtitle}  ·  Topics: ${r.topicText}`, { size: 18 }));
    children.push(P("Name: ____________________    Class: __________    Date: __________", { after: 240 }));
    if (r.kind === "worksheet") children.push(P(`Time: ${r.minutes} minutes    Total marks: ${r.totalMarks}`, { bold: true }));
    if (r.kind === "exam") children.push(P(`Total marks: ${r.totalMarks}`, { bold: true }));

    const addImage = async (src) => {
      try {
        const buf = await imageToPng(src);
        if (!buf) return;
        children.push(new D.Paragraph({ children: [new D.ImageRun({ data: buf.data, transformation: { width: buf.w, height: buf.h }, type: "png" })] }));
      } catch (e) { children.push(P("[image: " + src + "]", { italic: true })); }
    };
    const addSvg = async (svgEl) => {
      try {
        const buf = await svgToPng(svgEl);
        children.push(new D.Paragraph({ children: [new D.ImageRun({ data: buf.data, transformation: { width: buf.w, height: buf.h }, type: "png" })] }));
      } catch (e) { children.push(P("[graph]", { italic: true })); }
    };
    const addTable = (t) => {
      const rows = [];
      if (t.headers) rows.push(new D.TableRow({ children: t.headers.map((h) => new D.TableCell({ children: [P(strip(h), { bold: true })] })) }));
      t.rows.forEach((row) => rows.push(new D.TableRow({ children: row.map((c) => new D.TableCell({ children: [P(c === null ? "" : strip(String(c)))] })) })));
      children.push(new D.Table({ rows, width: { size: 60, type: D.WidthType.PERCENTAGE } }));
      children.push(P(""));
    };
    const addLines = (q) => {
      if (q.type === "mcq" && q.options) { q.options.forEach((o) => children.push(P("☐ " + strip(o), { after: 40 }))); return; }
      const n = q.type === "calculation" ? (q.marks >= 4 ? 6 : 4)
        : (q.lines !== undefined ? q.lines : Math.max(1, q.marks >= 6 ? q.marks + 4 : q.marks));
      for (let i = 0; i < n; i++) children.push(P("_".repeat(78), { after: 60 }));
    };
    const addQuestion = async (q, n) => {
      children.push(P(`${n}. ${strip(q.text || "")}`, { after: 80 }));
      for (const src of (q.images || (q.image ? [q.image] : []))) await addImage(src);
      if (q.table) addTable(q.table);
      if (q.graph) await addSvg(renderGraph(q.graph));
      if (q.parts) {
        for (const p of q.parts) {
          children.push(P(`${p.label} ${strip(p.text)}`, { after: 80 }));
          if (p.image) await addImage(p.image);
          if (p.table) addTable(p.table);
          if (p.graph) await addSvg(renderGraph(p.graph));
          addLines(p);
          children.push(P(`[${p.marks} mark${p.marks === 1 ? "" : "s"}]`, { right: true, size: 18 }));
        }
      } else {
        addLines(q);
        children.push(P(`[${q.marks} mark${q.marks === 1 ? "" : "s"}]`, { right: true, size: 18 }));
      }
      if (q.source) children.push(P(q.source, { italic: true, size: 14, after: 200 }));
    };

    if (r.kind === "starter") {
      let n = 0;
      if (r.match.length) {
        n++;
        children.push(P(`${n}. Match each key word to its definition`, { bold: true }));
        const defs = r._matchOrder || r.match;
        r.match.forEach((k, i) => {
          children.push(P(`${i + 1}. ${k.term}        ${String.fromCharCode(65 + i)}. ${defs[i].definition}`, { after: 60 }));
        });
        children.push(P(""));
      }
      if (r.gaps.length) {
        n++;
        children.push(P(`${n}. Fill in the gaps`, { bold: true }));
        children.push(P("Word bank: " + shuffle(r.gaps).map((k) => k.term).join("  ·  "), { italic: true }));
        r.gaps.forEach((k, i) => {
          const s = k.sentence ? k.sentence.replace(/_{2,}/g, "______________") : `______________ : ${k.definition}`;
          children.push(P(`${i + 1}. ${s}`, { after: 60 }));
        });
        children.push(P(""));
      }
      if (r.quick.length) {
        n++;
        children.push(P(`${n}. Quick questions`, { bold: true }));
        for (let i = 0; i < r.quick.length; i++) await addQuestion(r.quick[i], i + 1);
      }
    } else {
      for (let i = 0; i < r.questions.length; i++) await addQuestion(r.questions[i], i + 1);
    }

    // answers on a new page
    children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    children.push(P("Answers and mark scheme", { bold: true, size: 26 }));
    if (r.kind === "starter") {
      if (r.match.length && r._matchOrder) children.push(P("Match: " + r.match.map((k, i) => `${i + 1}${String.fromCharCode(65 + r._matchOrder.indexOf(k))}`).join(", ")));
      if (r.gaps.length) children.push(P("Gaps: " + r.gaps.map((k, i) => `${i + 1}. ${k.term}`).join("; ")));
    }
    r.questions.forEach((q, i) => {
      strip(answerText(q)).split("\n").forEach((line, j) => children.push(P((j === 0 ? `${i + 1}. ` : "    ") + line, { after: 40 })));
    });

    const doc = new D.Document({ sections: [{ children }] });
    const blob = await D.Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = safeName(r.title) + ".docx";
    document.body.appendChild(a); a.click(); a.remove();
  }

  function svgToPng(svgEl) {
    return new Promise((resolve, reject) => {
      const xml = new XMLSerializer().serializeToString(svgEl);
      const img = new Image();
      const w = +svgEl.getAttribute("width"), h = +svgEl.getAttribute("height");
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = w * 2; c.height = h * 2;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => b.arrayBuffer().then((buf) => resolve({ data: buf, w, h })), "image/png");
      };
      img.onerror = reject;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    });
  }
  function imageToPng(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const maxW = 450;
        const scale = Math.min(1, maxW / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        try {
          c.toBlob((b) => b ? b.arrayBuffer().then((buf) => resolve({ data: buf, w, h })) : resolve(null), "image/png");
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // ---------- helpers ----------
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function strip(html) {
    const d = document.createElement("div");
    d.innerHTML = String(html).replace(/<br\s*\/?>/gi, "\n").replace(/<sub>(.*?)<\/sub>/gi, (m, t) => subscript(t)).replace(/<sup>(.*?)<\/sup>/gi, (m, t) => superscript(t));
    return d.textContent;
  }
  const SUB = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻" };
  function subscript(t) { return t.split("").map((c) => SUB[c] || c).join(""); }
  function superscript(t) { return t.split("").map((c) => SUP[c] || c).join(""); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function safeName(s) { return s.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, ""); }

  // ---------- go ----------
  renderYears();
  refresh();
})();
