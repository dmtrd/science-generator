/* ============================================================
   Science Question Generator

   Data shapes this app understands
   --------------------------------
   A question is either a single question, or a multi-part exam question:

     { id, level, subject, topic, tier, marks, type, text, answer,
       guidance?, options?, image?, images?, table?, graph?, lines?,
       standalone?, source }

     { id, level, subject, topic, tier, marks, text, images?, source,
       parts: [ { label, text, marks, type, answer, guidance?, options?,
                  images?, standalone } ] }

   "standalone" says whether a part still makes sense on its own, away from
   the rest of its question. Worksheets may use single parts; exam questions
   always use the whole question so nothing is missing.
   ============================================================ */

(function () {
  "use strict";

  const S = window.STRUCTURE;
  const QUESTIONS = window.QUESTIONS || [];
  const KEYWORDS = window.KEYWORDS || {};
  const MODEL_ANSWERS = window.MODEL_ANSWERS || {};
  const SUBTOPICS = window.SUBTOPICS || [];

  /* Model answers live in their own file, keyed by question id (and part
     label for a multi-part question), so that re-extracting a past paper
     never overwrites them. They are attached here at start-up. */
  function attachModelAnswers() {
    QUESTIONS.forEach((q) => {
      if (q.parts) {
        q.parts.forEach((p) => {
          const m = MODEL_ANSWERS[q.id + "|" + p.label];
          if (m) p.modelAnswer = m;
        });
      } else if (MODEL_ANSWERS[q.id]) {
        q.modelAnswer = MODEL_ANSWERS[q.id];
      }
    });
  }

  const state = {
    year: null, level: null, subject: null, tier: null,
    topics: [],        // topic ids that are ticked
    subtopics: {},     // topic id -> array of ticked sub-topic ids
    expanded: {},      // topic id -> is its sub-topic list open
    mode: null, minutes: 10, count: 3,
    result: null, showAnswers: false
  };

  const $ = (s) => document.querySelector(s);
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
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ============================================================
  // Wizard
  // ============================================================
  function renderYears() {
    const box = $("#year-chips");
    box.innerHTML = "";
    S.yearGroups.forEach((y) => {
      const b = el("button", "chip", y.label);
      b.type = "button";
      b.onclick = () => {
        state.year = y.id; state.level = y.level;
        state.subject = null; state.tier = null; state.topics = [];
        mark(box, b); renderSubjects(); renderExam(); renderTopics(); refresh();
      };
      box.appendChild(b);
    });
    $("#step-year").classList.add("active");
  }

  function mark(container, chosen) {
    container.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
    if (chosen) chosen.classList.add("selected");
  }

  function renderSubjects() {
    const box = $("#subject-chips");
    box.innerHTML = "";
    if (!state.level) return;
    S.subjects[state.level].forEach((s) => {
      const b = el("button", "chip", s.label);
      b.type = "button";
      b.onclick = () => {
        state.subject = s.id; state.topics = [];
        mark(box, b); renderTopics(); refresh();
      };
      box.appendChild(b);
    });
  }

  function renderExam() {
    const lvl = S.levels[state.level];
    $("#level-label").textContent = lvl ? lvl.label : "";
    const box = $("#tier-chips");
    box.innerHTML = "";
    if (lvl && lvl.hasTiers) {
      S.tiers.forEach((t) => {
        const b = el("button", "chip", t.label);
        b.type = "button";
        b.onclick = () => { state.tier = t.id; mark(box, b); renderTopics(); refresh(); };
        box.appendChild(b);
      });
    } else {
      state.tier = null;
      box.appendChild(el("span", "hint", "No tiers at this level."));
    }
  }

  function subtopicsFor(topicId) {
    return SUBTOPICS.filter((s) => s.topic === topicId);
  }

  /* Keywords for the ticked topics, narrowed to the ticked lessons so a
     starter never asks about vocabulary the class has not met yet. */
  function keywordsFor(topicIds) {
    let out = [];
    topicIds.forEach((id) => {
      const all = KEYWORDS[id] || [];
      const picked = state.subtopics[id] || [];
      const subs = subtopicsFor(id);
      out = out.concat(
        (subs.length && picked.length && picked.length < subs.length)
          ? all.filter((k) => k.subtopic && picked.includes(k.subtopic))
          : all
      );
    });
    return out;
  }

  /* A part may sit in a different sub-topic from its parent question, so a
     part is matched on its own sub-topic where it has one. */
  function partMatches(q, part) {
    // a part may sit in a different topic from the question it came from
    const topic = part.topic || q.topic;
    if (!state.topics.includes(topic)) return false;
    const chosen = state.subtopics[topic];
    if (!chosen || !chosen.length || !subtopicsFor(topic).length) return true;
    // only inherit the question's sub-topic when the part sits in the same topic
    const sub = part.subtopic || (part.topic ? null : q.subtopic);
    return !!sub && chosen.includes(sub);
  }

  function topicsForSelection() {
    if (!state.level || !state.subject) return [];
    const byYear = (a, b) => {
      const ay = a.year === state.year ? 0 : 1, by = b.year === state.year ? 0 : 1;
      return ay - by;
    };
    return S.topics.filter((t) => {
      if (t.level !== state.level) return false;
      if (state.subject === "science") return true;
      if (state.subject === "combined") return t.combined !== false;
      return t.subject === state.subject;
    }).sort((a, b) => (state.level === "gcse" ? 0 : byYear(a, b)));
  }

  function renderTopics() {
    const list = $("#topic-list");
    list.innerHTML = "";
    const topics = topicsForSelection();

    topics.forEach((t) => {
      const subs = subtopicsFor(t.id);
      const row = el("div", "topic-row");

      const lab = el("label", "topic-main");
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = state.topics.includes(t.id);
      cb.onchange = () => {
        if (cb.checked) {
          if (!state.topics.includes(t.id)) state.topics.push(t.id);
          state.subtopics[t.id] = subs.map((s) => s.id);   // whole topic
          state.expanded[t.id] = false;
        } else {
          state.topics = state.topics.filter((x) => x !== t.id);
          delete state.subtopics[t.id];
        }
        renderTopics(); refresh();
      };
      lab.appendChild(cb);

      const tag = (state.subject === "science" || state.subject === "combined")
        ? `<span class="count">${cap(t.subject)}: </span>` : "";
      lab.appendChild(el("span", "topic-name", tag + t.label));

      if (subs.length) {
        const toggle = el("button", "sub-toggle", state.expanded[t.id] ? "▾" : "▸");
        toggle.type = "button";
        toggle.title = "Show lessons in this topic";
        toggle.onclick = (e) => {
          e.preventDefault();
          state.expanded[t.id] = !state.expanded[t.id];
          renderTopics();
        };
        lab.insertBefore(toggle, lab.firstChild);
      } else {
        lab.insertBefore(el("span", "sub-toggle spacer", ""), lab.firstChild);
      }

      const nItems = itemPoolFor(t).length;
      const nK = (KEYWORDS[t.id] || []).length;
      let badge = `${nItems} Q / ${nK} kw`;
      if (t.year && state.level !== "gcse") badge = `Y${t.year} · ` + badge;
      lab.appendChild(el("span", "badge", badge));
      row.appendChild(lab);

      if (subs.length && state.expanded[t.id]) {
        const box = el("div", "sub-list");
        subs.forEach((sub) => {
          const sl = el("label");
          const scb = document.createElement("input");
          scb.type = "checkbox";
          scb.checked = (state.subtopics[t.id] || []).includes(sub.id);
          scb.onchange = () => {
            const cur = state.subtopics[t.id] || [];
            state.subtopics[t.id] = scb.checked
              ? cur.concat([sub.id])
              : cur.filter((x) => x !== sub.id);
            const any = state.subtopics[t.id].length > 0;
            if (any && !state.topics.includes(t.id)) state.topics.push(t.id);
            if (!any) state.topics = state.topics.filter((x) => x !== t.id);
            renderTopics(); refresh();
          };
          sl.appendChild(scb);
          const num = /^(chem-|phys-)?\d+\./.test(sub.id)
            ? sub.id.replace(/^(chem-|phys-)/, "") + " " : "";
          sl.appendChild(el("span", null, num + sub.label));
          sl.appendChild(el("span", "badge", countFor(t, sub.id) + " Q"));
          box.appendChild(sl);
        });
        row.appendChild(box);
      }
      list.appendChild(row);
    });

    if (!topics.length) list.appendChild(el("p", "hint", "Choose a year group and subject first."));
  }

  /* Counts shown beside a topic ignore whatever is currently ticked, so the
     numbers do not change as boxes are clicked. */
  function itemPoolFor(t) {
    const saved = state.subtopics[t.id];
    delete state.subtopics[t.id];
    const n = itemPool([t.id]);
    if (saved) state.subtopics[t.id] = saved;
    return n;
  }

  function countFor(t, subId) {
    const saved = state.subtopics[t.id];
    state.subtopics[t.id] = [subId];
    const n = itemPool([t.id]).length;
    if (saved) state.subtopics[t.id] = saved; else delete state.subtopics[t.id];
    return n;
  }

  $("#topics-all").onclick = () => {
    state.topics = topicsForSelection().map((t) => t.id);
    state.topics.forEach((id) => { state.subtopics[id] = subtopicsFor(id).map((s) => s.id); });
    renderTopics(); refresh();
  };
  $("#topics-none").onclick = () => {
    state.topics = []; state.subtopics = {}; state.expanded = {};
    renderTopics(); refresh();
  };

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

  // ============================================================
  // Selecting questions
  // ============================================================
  function matchesSelection(q, topicIds) {
    if (q.level !== state.level) return false;
    if (!topicIds.includes(q.topic)) return false;
    // If some sub-topics of this topic are ticked, only those count. This is
    // what keeps a starter to material a class has actually been taught.
    const chosen = state.subtopics[q.topic];
    if (chosen && chosen.length && subtopicsFor(q.topic).length) {
      if (!q.subtopic || !chosen.includes(q.subtopic)) return false;
    }
    if (state.level === "gcse") {
      if (state.subject === "combined" && q.combined === false) return false;
      if (state.tier && q.tier && q.tier !== "both" && q.tier !== state.tier) return false;
    }
    return true;
  }

  /* Whole questions, as they appear on the paper. */
  function questionPool(topicIds) {
    return QUESTIONS.filter((q) => matchesSelection(q, topicIds));
  }

  /* Every usable item: a single question, or one standalone part of a
     multi-part question. This is what a worksheet draws on. */
  function itemPool(topicIds) {
    const items = [];
    QUESTIONS.forEach((q) => {
      if (!matchesSelection(q, topicIds)) return;
      if (!q.parts) {
        items.push({ kind: "single", q: q, marks: q.marks });
        return;
      }
      q.parts.forEach((p) => {
        if (p.standalone && partMatches(q, p)) {
          items.push({ kind: "part", q: q, part: p, marks: p.marks });
        }
      });
    });
    return items;
  }

  /* Simple text-only questions for a lesson starter: no diagrams, tables or
     graphs, short, and worth a mark or two. */
  function starterPool(topicIds) {
    return itemPool(topicIds).filter((it) => {
      const src = it.kind === "part" ? it.part : it.q;
      if (it.marks > 2) return false;
      if (src.images || src.image || src.table || src.graph) return false;
      if (it.kind === "part" && (it.q.images || it.q.image)) return false;
      const text = src.text || "";
      if (text.length > 220) return false;
      if (/figure|table \d|graph|diagram|shown above|below/i.test(text)) return false;
      return true;
    });
  }

  function refresh() {
    const lvl = S.levels[state.level];
    const tierOk = !lvl || !lvl.hasTiers || state.tier;
    setActive("#step-subject", !!state.level);
    setActive("#step-exam", !!state.subject);
    setActive("#step-topic", !!state.subject && tierOk);
    setActive("#step-mode", state.topics.length > 0);
    $("#generate").disabled = !(state.topics.length && state.mode && tierOk);

    const info = $("#pool-info");
    info.className = "hint";
    if (!state.topics.length) { info.textContent = ""; return; }

    const items = itemPool(state.topics);
    const marks = sum(items, (i) => i.marks);
    const kws = keywordsFor(state.topics).length;
    info.textContent = `${items.length} questions (${marks} marks) and ${kws} keywords available.`;

    if (state.mode === "worksheet" && marks < targetMarks()) {
      info.className = "hint warn";
      info.textContent += ` Not enough for ${state.minutes} minutes yet.`;
    }
    if (state.mode === "starter") {
      const n = starterPool(state.topics).length;
      info.textContent = `${n} quick questions and ${kws} keywords available for a starter.`;
      if (n < 3 && kws < 4) {
        info.className = "hint warn";
        info.textContent += " Add more to data/questions or data/keywords.";
      }
    }
    if (state.mode === "exam" && !questionPool(state.topics).length) {
      info.className = "hint warn";
      info.textContent += " No full exam questions for this selection.";
    }
  }
  function setActive(sel, on) { $(sel).classList.toggle("active", !!on); }

  function targetMarks() {
    const mpm = (S.levels[state.level] || {}).minutesPerMark || 1;
    return Math.round(state.minutes / mpm);
  }

  // ============================================================
  // Building the output
  // ============================================================
  $("#generate").onclick = generate;
  $("#btn-shuffle").onclick = generate;
  $("#btn-answers").onclick = () => {
    state.showAnswers = !state.showAnswers;
    $("#btn-answers").textContent = state.showAnswers ? "Hide answers" : "Show answers";
    const a = $("#paper .answers");
    if (a) a.hidden = !state.showAnswers;
  };
  $("#btn-print").onclick = () => window.print();
  $("#btn-word").onclick = exportWord;

  function generate() {
    let r;
    if (state.mode === "worksheet") r = buildWorksheet();
    else if (state.mode === "exam") r = buildExam();
    else r = buildStarter();
    state.result = r;
    renderPaper(r);
    $("#output-section").hidden = false;
    $("#output-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function headerInfo() {
    const yr = S.yearGroups.find((y) => y.id === state.year);
    const subj = S.subjects[state.level].find((s) => s.id === state.subject);
    const lvl = S.levels[state.level];
    const tier = state.tier ? S.tiers.find((t) => t.id === state.tier).label + " tier" : null;
    const labels = state.topics.map((id) => {
      const topic = S.topics.find((t) => t.id === id);
      const all = subtopicsFor(id);
      const picked = state.subtopics[id] || [];
      // name the lessons when only part of a topic is selected
      if (all.length && picked.length && picked.length < all.length) {
        const names = all.filter((s) => picked.includes(s.id)).map((s) => s.label);
        return topic.label + " (" + names.join(", ") + ")";
      }
      return topic.label;
    });
    return {
      subtitle: `${yr.label} · ${lvl.label}${tier ? " · " + tier : ""}`,
      subject: subj.label,
      topicText: topicSummary(labels)
    };
  }

  /* A header listing thirty topics is unreadable, so summarise past four. */
  function topicSummary(topics) {
    if (topics.length <= 4) return topics.join("; ");
    return topics.slice(0, 3).join("; ") + ` and ${topics.length - 3} more topics`;
  }

  function buildWorksheet() {
    const target = targetMarks();
    const pool = shuffle(itemPool(state.topics));
    const chosen = [];
    let total = 0;
    // fill the time, preferring a spread of question sizes
    for (const it of pool) {
      if (total >= target) break;
      if (total + it.marks <= target) { chosen.push(it); total += it.marks; }
    }
    for (const it of pool) {
      if (total >= target) break;
      if (!chosen.includes(it) && total + it.marks <= target) { chosen.push(it); total += it.marks; }
    }
    chosen.sort((a, b) => a.marks - b.marks);
    const h = headerInfo();
    return {
      kind: "worksheet",
      title: `${h.subject}: ${state.minutes} minute worksheet`,
      subtitle: h.subtitle, topicText: h.topicText,
      minutes: state.minutes, targetMarks: target,
      items: chosen, totalMarks: total
    };
  }

  function buildExam() {
    // whole questions only, so nothing is missing from the context
    const pool = shuffle(questionPool(state.topics));
    const chosen = pool.slice(0, state.count)
      .map((q) => ({ kind: q.parts ? "whole" : "single", q: q, marks: q.marks }))
      .sort((a, b) => a.marks - b.marks);
    const h = headerInfo();
    return {
      kind: "exam",
      title: `${h.subject}: exam questions`,
      subtitle: h.subtitle, topicText: h.topicText,
      items: chosen, totalMarks: sum(chosen, (i) => i.marks)
    };
  }

  function buildStarter() {
    const h = headerInfo();
    const kws = shuffle(keywordsFor(state.topics));
    const quick = shuffle(starterPool(state.topics)).slice(0, 5);
    return {
      kind: "starter",
      title: `${h.subject}: starter`,
      subtitle: h.subtitle, topicText: h.topicText,
      match: $("#st-match").checked ? kws.slice(0, 6) : [],
      gaps: $("#st-gaps").checked ? (kws.slice(6, 10).length >= 3 ? kws.slice(6, 10) : kws.slice(0, 4)) : [],
      items: $("#st-quick").checked ? quick : [],
      totalMarks: 0
    };
  }

  // ============================================================
  // Rendering
  // ============================================================
  function renderPaper(r) {
    const paper = $("#paper");
    paper.innerHTML = "";
    paper.appendChild(el("h1", null, esc(r.title)));
    paper.appendChild(el("div", "meta", esc(r.subtitle) + " · Topics: " + esc(r.topicText)));
    paper.appendChild(el("div", "name-line", "<span>Name:</span><span>Class:</span><span>Date:</span>"));

    if (r.kind === "worksheet") {
      let line = `Time: <b>${r.minutes} minutes</b> &nbsp;·&nbsp; Total marks: <b>${r.totalMarks}</b>`;
      if (r.totalMarks < r.targetMarks * 0.8) {
        line += ` <i>(only ${r.totalMarks} marks available for this selection)</i>`;
      }
      paper.appendChild(el("div", "summary", line));
    }
    if (r.kind === "exam") {
      paper.appendChild(el("div", "summary", `Total marks: <b>${r.totalMarks}</b>`));
    }

    if (r.kind === "starter") renderStarter(paper, r);
    else r.items.forEach((it, i) => paper.appendChild(renderItem(it, i + 1)));

    if (!r.items.length && r.kind !== "starter") {
      paper.appendChild(el("p", "hint warn", "Nothing matched this selection."));
    }

    const ans = el("div", "answers");
    ans.appendChild(el("h2", null, "Answers and mark scheme"));
    if (r.kind === "starter") renderStarterAnswers(ans, r);
    r.items.forEach((it, i) => renderItemAnswer(ans, it, i + 1));
    ans.hidden = !state.showAnswers;
    paper.appendChild(ans);
  }

  /* One numbered item on the sheet. An item is a whole question, a single
     question, or one standalone part lifted out of a bigger question. */
  function renderItem(it, n) {
    const wrap = el("div", "question");
    const head = el("div", "q-head");
    head.appendChild(el("div", "q-num", n + "."));
    const body = el("div", "q-body");

    if (it.kind === "whole" && it.q.parts) {
      const seen = new Set();
      if (it.q.text) body.appendChild(el("p", "q-text", it.q.text));
      addMedia(body, it.q, seen);
      it.q.parts.forEach((p, i) => body.appendChild(renderPart(p, i, seen)));
    } else if (it.kind === "part") {
      // a part on its own: print the question's opening line first so it reads
      if (it.q.text && it.q.text.length < 300) {
        body.appendChild(el("p", "q-text stem", it.q.text));
      }
      body.appendChild(el("p", "q-text", it.part.text));
      addMedia(body, it.part);
      body.appendChild(answerSpace(it.part));
      body.appendChild(marksTag(it.part.marks));
    } else {
      if (it.q.text) body.appendChild(el("p", "q-text", it.q.text));
      addMedia(body, it.q);
      body.appendChild(answerSpace(it.q));
      body.appendChild(marksTag(it.q.marks));
    }

    if (it.q.source) body.appendChild(el("div", "source", esc(it.q.source)));
    head.appendChild(body);
    wrap.appendChild(head);
    return wrap;
  }

  function renderPart(p, i, seen) {
    const part = el("div", "part");
    part.appendChild(el("div", "p-label", "(" + "abcdefghij"[i] + ")"));
    const pb = el("div", "p-body");
    pb.appendChild(el("div", "q-text", p.text));
    addMedia(pb, p, seen);
    pb.appendChild(answerSpace(p));
    pb.appendChild(marksTag(p.marks));
    part.appendChild(pb);
    return part;
  }

  function marksTag(m) {
    return el("div", "marks", `[${m} mark${m === 1 ? "" : "s"}]`);
  }

  /* `seen` stops the same figure being printed again for every part that
     refers to it, which happens a lot on multi-part exam questions. */
  function addMedia(node, src, seen) {
    (src.images || (src.image ? [src.image] : [])).forEach((s) => {
      if (seen) {
        if (seen.has(s)) return;
        seen.add(s);
      }
      const img = el("img", "q-image");
      img.src = s; img.alt = src.imageAlt || "figure";
      node.appendChild(img);
    });
    if (src.table) node.appendChild(renderTable(src.table));
    if (src.graph) node.appendChild(renderGraph(src.graph));
  }

  function answerSpace(q) {
    if (q.type === "mcq" && q.options) {
      const ul = el("ul", "options");
      q.options.forEach((o) => ul.appendChild(el("li", null, o)));
      return ul;
    }
    if (q.type === "calculation") {
      return el("div", "answer-box" + (q.marks >= 4 ? " tall" : ""));
    }
    const n = q.lines !== undefined ? q.lines : Math.max(1, q.marks >= 6 ? q.marks + 3 : q.marks);
    const box = el("div", "answer-lines");
    for (let i = 0; i < n; i++) box.appendChild(el("div", "line"));
    return box;
  }

  function renderItemAnswer(ans, it, n) {
    const d = el("div", "ans");
    if (it.kind === "whole" && it.q.parts) {
      d.appendChild(el("div", "q-num", n + "."));
      it.q.parts.forEach((p, i) => {
        const sub = el("div", "sub-ans");
        sub.appendChild(el("span", "p-label", "(" + "abcdefghij"[i] + ") "));
        renderMarkScheme(sub, p);
        d.appendChild(sub);
      });
    } else {
      const src = it.kind === "part" ? it.part : it.q;
      d.appendChild(el("span", "q-num", n + ". "));
      renderMarkScheme(d, src);
    }
    ans.appendChild(d);
  }

  /* The mark scheme as AQA lays it out: lead-in, bullet points with their
     detail indented under them, sub-headings, level bands, then the marking
     guidance and a model answer where there is one. */
  function renderMarkScheme(node, src) {
    const blocks = src.answerBlocks;
    if (!blocks || !blocks.length) {
      node.appendChild(el("span", "ms", src.answer || ""));
    } else {
      let list = null, sublist = null;
      const closeLists = () => { list = null; sublist = null; };
      blocks.forEach((b) => {
        if (b.type === "point") {
          if (!list) { list = el("ul", "ms-points"); node.appendChild(list); sublist = null; }
          if (b.level) {
            if (!sublist) {
              sublist = el("ul", "ms-sub");
              (list.lastElementChild || list).appendChild(sublist);
            }
            sublist.appendChild(el("li", null, b.text));
          } else {
            sublist = null;
            list.appendChild(el("li", null, b.text));
          }
          return;
        }
        closeLists();
        if (b.type === "lead") node.appendChild(el("div", "ms-lead", b.text));
        else if (b.type === "heading") node.appendChild(el("div", "ms-heading", b.text));
        else if (b.type === "band") node.appendChild(el("div", "ms-band", b.text));
        else node.appendChild(el("div", "ms-note", b.text));
      });
    }
    if (src.modelAnswer) {
      const box = el("div", "model-answer");
      box.appendChild(el("div", "model-label", "Sample full-mark answer"));
      box.appendChild(el("div", "model-text", src.modelAnswer));
      node.appendChild(box);
    }
    if (src.guidance) node.appendChild(el("div", "guidance", src.guidance));
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

  function renderGraph(g) {
    const W = g.width || 440, H = g.height || 300;
    const m = { l: 56, r: 16, t: 14, b: 48 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const xMax = g.xMax, yMax = g.yMax;
    const xStep = g.xStep || niceStep(xMax), yStep = g.yStep || niceStep(yMax);
    const sx = (x) => m.l + (x / xMax) * pw;
    const sy = (y) => m.t + ph - (y / yMax) * ph;
    let s = `<svg class="graph" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
    for (let x = 0; x <= xMax + 1e-9; x += xStep / 5) s += `<line x1="${sx(x)}" y1="${m.t}" x2="${sx(x)}" y2="${m.t + ph}" stroke="#e6e6e6" stroke-width="0.6"/>`;
    for (let y = 0; y <= yMax + 1e-9; y += yStep / 5) s += `<line x1="${m.l}" y1="${sy(y)}" x2="${m.l + pw}" y2="${sy(y)}" stroke="#e6e6e6" stroke-width="0.6"/>`;
    for (let x = 0; x <= xMax + 1e-9; x += xStep) {
      s += `<line x1="${sx(x)}" y1="${m.t}" x2="${sx(x)}" y2="${m.t + ph}" stroke="#bbb" stroke-width="0.9"/>`;
      s += `<text x="${sx(x)}" y="${m.t + ph + 16}" font-size="11" text-anchor="middle">${fmt(x)}</text>`;
    }
    for (let y = 0; y <= yMax + 1e-9; y += yStep) {
      s += `<line x1="${m.l}" y1="${sy(y)}" x2="${m.l + pw}" y2="${sy(y)}" stroke="#bbb" stroke-width="0.9"/>`;
      s += `<text x="${m.l - 6}" y="${sy(y) + 4}" font-size="11" text-anchor="end">${fmt(y)}</text>`;
    }
    s += `<line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + ph}" stroke="#000" stroke-width="1.4"/>`;
    s += `<line x1="${m.l}" y1="${m.t + ph}" x2="${m.l + pw}" y2="${m.t + ph}" stroke="#000" stroke-width="1.4"/>`;
    s += `<text x="${m.l + pw / 2}" y="${H - 8}" font-size="12" text-anchor="middle">${esc(g.xLabel || "")}</text>`;
    s += `<text transform="translate(14 ${m.t + ph / 2}) rotate(-90)" font-size="12" text-anchor="middle">${esc(g.yLabel || "")}</text>`;
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
    const raw = max / 5, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function fmt(v) { return Math.round(v * 1000) / 1000; }

  // ---------- starter ----------
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
      b.appendChild(el("div", "word-bank", "<b>Word bank:</b> " +
        shuffle(r.gaps).map((k) => esc(k.term)).join(" &nbsp;·&nbsp; ")));
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
    if (r.items.length) {
      n++;
      const b = el("div", "starter-block");
      b.appendChild(el("h3", null, `${n}. Quick questions`));
      const ol = el("ol", "quick");
      r.items.forEach((it) => {
        const src = it.kind === "part" ? it.part : it.q;
        const li = el("li");
        li.appendChild(el("div", "q-text", src.text));
        if (src.options) {
          const ul = el("ul", "options");
          src.options.forEach((o) => ul.appendChild(el("li", null, o)));
          li.appendChild(ul);
        } else {
          const lines = el("div", "answer-lines");
          for (let i = 0; i < Math.max(1, src.marks); i++) lines.appendChild(el("div", "line"));
          li.appendChild(lines);
        }
        ol.appendChild(li);
      });
      b.appendChild(ol);
      paper.appendChild(b);
    }
    if (!n) paper.appendChild(el("p", "hint warn",
      "Nothing to show: tick a starter activity, or add keywords for this topic."));
  }

  function renderStarterAnswers(ans, r) {
    if (r.match.length && r._matchOrder) {
      const d = el("div", "ans");
      d.appendChild(el("span", "q-num", "Match: "));
      d.appendChild(el("span", "ms", r.match.map((k, i) =>
        `${i + 1}${String.fromCharCode(65 + r._matchOrder.indexOf(k))}`).join(", ")));
      ans.appendChild(d);
    }
    if (r.gaps.length) {
      const d = el("div", "ans");
      d.appendChild(el("span", "q-num", "Gaps: "));
      d.appendChild(el("span", "ms", r.gaps.map((k, i) => `${i + 1}. ${esc(k.term)}`).join("; ")));
      ans.appendChild(d);
    }
  }

  // ============================================================
  // Word export
  // ============================================================
  async function exportWord() {
    if (!window.docx) {
      alert("The Word library did not load (are you offline?). Use Print / Save as PDF instead.");
      return;
    }
    const r = state.result;
    if (!r) return;
    const D = window.docx;
    const children = [];
    const P = (text, o = {}) => new D.Paragraph({
      children: [new D.TextRun({ text: text, bold: !!o.bold, size: o.size || 22, italics: !!o.italic })],
      spacing: { after: o.after !== undefined ? o.after : 120 },
      alignment: o.right ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT
    });

    children.push(P(r.title, { bold: true, size: 30 }));
    children.push(P(`${r.subtitle}  ·  Topics: ${r.topicText}`, { size: 18 }));
    children.push(P("Name: ____________________    Class: __________    Date: __________", { after: 240 }));
    if (r.kind === "worksheet") children.push(P(`Time: ${r.minutes} minutes    Total marks: ${r.totalMarks}`, { bold: true }));
    if (r.kind === "exam") children.push(P(`Total marks: ${r.totalMarks}`, { bold: true }));

    const addMediaW = async (src, seen) => {
      for (const s of (src.images || (src.image ? [src.image] : []))) {
        if (seen) { if (seen.has(s)) continue; seen.add(s); }
        const buf = await imageToPng(s);
        if (buf) children.push(new D.Paragraph({ children: [new D.ImageRun({ data: buf.data, transformation: { width: buf.w, height: buf.h }, type: "png" })] }));
      }
      if (src.table) addTableW(src.table);
      if (src.graph) {
        const buf = await svgToPng(renderGraph(src.graph));
        if (buf) children.push(new D.Paragraph({ children: [new D.ImageRun({ data: buf.data, transformation: { width: buf.w, height: buf.h }, type: "png" })] }));
      }
    };
    const addTableW = (t) => {
      const rows = [];
      if (t.headers) rows.push(new D.TableRow({ children: t.headers.map((h) => new D.TableCell({ children: [P(strip(h), { bold: true })] })) }));
      t.rows.forEach((row) => rows.push(new D.TableRow({ children: row.map((c) => new D.TableCell({ children: [P(c === null ? "" : strip(String(c)))] })) })));
      children.push(new D.Table({ rows: rows, width: { size: 60, type: D.WidthType.PERCENTAGE } }));
      children.push(P(""));
    };
    const addLinesW = (q) => {
      if (q.type === "mcq" && q.options) { q.options.forEach((o) => children.push(P("☐ " + strip(o), { after: 40 }))); return; }
      const n = q.type === "calculation" ? (q.marks >= 4 ? 6 : 4)
        : (q.lines !== undefined ? q.lines : Math.max(1, q.marks >= 6 ? q.marks + 3 : q.marks));
      for (let i = 0; i < n; i++) children.push(P("_".repeat(78), { after: 60 }));
    };

    for (let i = 0; i < r.items.length; i++) {
      const it = r.items[i];
      if (it.kind === "whole" && it.q.parts) {
        const seenW = new Set();
        children.push(P(`${i + 1}. ${strip(it.q.text || "")}`, { after: 80 }));
        await addMediaW(it.q, seenW);
        for (let j = 0; j < it.q.parts.length; j++) {
          const p = it.q.parts[j];
          children.push(P(`(${"abcdefghij"[j]}) ${strip(p.text)}`, { after: 80 }));
          await addMediaW(p, seenW);
          addLinesW(p);
          children.push(P(`[${p.marks} mark${p.marks === 1 ? "" : "s"}]`, { right: true, size: 18 }));
        }
      } else {
        const src = it.kind === "part" ? it.part : it.q;
        const stem = (it.kind === "part" && it.q.text && it.q.text.length < 300) ? it.q.text + " " : "";
        children.push(P(`${i + 1}. ${strip(stem + src.text)}`, { after: 80 }));
        await addMediaW(src);
        addLinesW(src);
        children.push(P(`[${src.marks} mark${src.marks === 1 ? "" : "s"}]`, { right: true, size: 18 }));
      }
      if (it.q.source) children.push(P(it.q.source, { italic: true, size: 14, after: 200 }));
    }

    if (r.kind === "starter") {
      let n = 0;
      if (r.match.length) {
        n++;
        children.push(P(`${n}. Match each key word to its definition`, { bold: true }));
        const defs = r._matchOrder || r.match;
        r.match.forEach((k, i) => children.push(P(`${i + 1}. ${k.term}        ${String.fromCharCode(65 + i)}. ${defs[i].definition}`, { after: 60 })));
      }
      if (r.gaps.length) {
        n++;
        children.push(P(`${n}. Fill in the gaps`, { bold: true }));
        children.push(P("Word bank: " + shuffle(r.gaps).map((k) => k.term).join("  ·  "), { italic: true }));
        r.gaps.forEach((k, i) => {
          const s = k.sentence ? k.sentence.replace(/_{2,}/g, "______________") : `______________ : ${k.definition}`;
          children.push(P(`${i + 1}. ${s}`, { after: 60 }));
        });
      }
    }

    children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    children.push(P("Answers and mark scheme", { bold: true, size: 26 }));
    if (r.kind === "starter") {
      if (r.match.length && r._matchOrder) children.push(P("Match: " + r.match.map((k, i) => `${i + 1}${String.fromCharCode(65 + r._matchOrder.indexOf(k))}`).join(", ")));
      if (r.gaps.length) children.push(P("Gaps: " + r.gaps.map((k, i) => `${i + 1}. ${k.term}`).join("; ")));
    }
    const addMarkScheme = (src, prefix) => {
      const blocks = src.answerBlocks;
      if (!blocks || !blocks.length) {
        strip(src.answer || "").split("\n").forEach((line, k) =>
          children.push(P((k === 0 ? prefix : "     ") + line, { after: 30 })));
      } else {
        let first = true;
        blocks.forEach((b) => {
          const head = first ? prefix : "     ";
          first = false;
          const text = strip(b.text);
          if (b.type === "point") children.push(P(head + (b.level ? "      \u25E6 " : "   \u2022 ") + text, { after: 25 }));
          else if (b.type === "heading") children.push(P(head + text, { bold: true, after: 30 }));
          else if (b.type === "note") children.push(P(head + text, { italic: true, size: 18, after: 25 }));
          else children.push(P(head + text, { after: 30 }));
        });
      }
      if (src.modelAnswer) {
        children.push(P("     Sample full-mark answer:", { bold: true, size: 18, after: 20 }));
        children.push(P("     " + strip(src.modelAnswer), { size: 20, after: 40 }));
      }
      if (src.guidance) {
        strip(src.guidance).split("\n").forEach((line) =>
          children.push(P("     " + line, { italic: true, size: 16, after: 20 })));
      }
    };

    r.items.forEach((it, i) => {
      if (it.kind === "whole" && it.q.parts) {
        children.push(P(`${i + 1}.`, { bold: true, after: 40 }));
        it.q.parts.forEach((p, j) => addMarkScheme(p, `(${"abcdefghij"[j]}) `));
      } else {
        addMarkScheme(it.kind === "part" ? it.part : it.q, `${i + 1}. `);
      }
    });

    const doc = new D.Document({ sections: [{ children: children }] });
    const blob = await D.Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = safeName(r.title) + ".docx";
    document.body.appendChild(a); a.click(); a.remove();
  }

  function svgToPng(svgEl) {
    return new Promise((resolve) => {
      const xml = new XMLSerializer().serializeToString(svgEl);
      const img = new Image();
      const w = +svgEl.getAttribute("width"), h = +svgEl.getAttribute("height");
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = w * 2; c.height = h * 2;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => b ? b.arrayBuffer().then((buf) => resolve({ data: buf, w: w, h: h })) : resolve(null), "image/png");
      };
      img.onerror = () => resolve(null);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    });
  }
  function imageToPng(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const scale = Math.min(1, 450 / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        try {
          c.toBlob((b) => b ? b.arrayBuffer().then((buf) => resolve({ data: buf, w: w, h: h })) : resolve(null), "image/png");
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function strip(html) {
    const d = document.createElement("div");
    d.innerHTML = String(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<sub>(.*?)<\/sub>/gi, (m, t) => t.split("").map((c) => SUB[c] || c).join(""))
      .replace(/<sup>(.*?)<\/sup>/gi, (m, t) => t.split("").map((c) => SUP[c] || c).join(""));
    return d.textContent;
  }
  const SUB = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
  const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "+": "⁺", "-": "⁻" };
  function safeName(s) { return s.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, ""); }

  attachModelAnswers();
  renderYears();
  refresh();
})();
