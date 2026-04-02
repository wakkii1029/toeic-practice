/* ── Practice page logic ─────────────────────────────────── */

let selectedPart = null;
let currentProblem = null;
let userAnswers = {};

// ── Helpers ──────────────────────────────────────────────

async function apiFetch(url, opts = {}) {
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return resp.json();
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ── Part selection ───────────────────────────────────────

function selectPart(part) {
  selectedPart = part;
  document.querySelectorAll(".part-pill").forEach((el) => {
    el.classList.toggle("active", parseInt(el.dataset.part) === part);
  });
  document.getElementById("generateBtn").disabled = false;
  // Reset
  document.getElementById("problemArea").classList.add("hidden");
  document.getElementById("resultArea").classList.add("hidden");
}

// ── Generate problem ─────────────────────────────────────

async function generateProblem() {
  if (!selectedPart) return;
  const btn = document.getElementById("generateBtn");
  const status = document.getElementById("generateStatus");
  btn.disabled = true;
  status.innerHTML = '<span class="spinner"></span> 問題を生成中...';

  document.getElementById("resultArea").classList.add("hidden");
  document.getElementById("problemArea").classList.add("hidden");

  try {
    const problem = await apiFetch("/api/generate", {
      method: "POST",
      body: JSON.stringify({ part: selectedPart }),
    });

    if (problem.error) {
      status.textContent = "エラー: " + problem.error;
      btn.disabled = false;
      return;
    }

    currentProblem = problem;
    userAnswers = {};
    renderProblem(problem);
    status.textContent = "";
    document.getElementById("problemArea").classList.remove("hidden");
  } catch (e) {
    status.textContent = "エラー: " + e.message;
  }
  btn.disabled = false;
}

// ── Render problem by part ───────────────────────────────

function renderProblem(problem) {
  const part = problem.part;
  const data = problem.data;
  const display = document.getElementById("problemDisplay");
  const answerArea = document.getElementById("answerArea");
  const audioSection = document.getElementById("audioSection");
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  document.getElementById("submitSection").classList.remove("hidden");

  // Audio for listening parts
  if ([1, 2, 3, 4].includes(part) && data.audio_text) {
    audioSection.classList.remove("hidden");
    audioSection.dataset.text = data.audio_text;
  } else {
    audioSection.classList.add("hidden");
  }

  let html = "";
  let answerHtml = "";

  if (part === 1) {
    html = `
      <h3 class="font-bold text-lg mb-3">Part 1 — 写真描写問題</h3>
      <div class="bg-gray-100 rounded-lg p-4 mb-4 italic text-gray-700">
        <p class="text-sm text-gray-500 mb-1">Scene:</p>
        ${escapeHtml(data.scene_description)}
      </div>
    `;
    answerHtml = renderChoices(data.choices, "q0");
  } else if (part === 2) {
    html = `
      <h3 class="font-bold text-lg mb-3">Part 2 — 応答問題</h3>
      <div class="bg-gray-100 rounded-lg p-4 mb-4">
        <p class="font-medium">${escapeHtml(data.question)}</p>
      </div>
    `;
    answerHtml = renderChoices(data.choices, "q0");
  } else if (part === 3) {
    html = `
      <h3 class="font-bold text-lg mb-3">Part 3 — 会話問題</h3>
      <div class="bg-gray-100 rounded-lg p-4 mb-4 whitespace-pre-line">${escapeHtml(data.conversation)}</div>
    `;
    answerHtml = renderMultiQuestions(data.questions);
  } else if (part === 4) {
    html = `
      <h3 class="font-bold text-lg mb-3">Part 4 — 説明文問題</h3>
      <div class="bg-gray-100 rounded-lg p-4 mb-4 whitespace-pre-line">${escapeHtml(data.talk)}</div>
    `;
    answerHtml = renderMultiQuestions(data.questions);
  } else if (part === 5) {
    html = `
      <h3 class="font-bold text-lg mb-3">Part 5 — 短文穴埋め問題</h3>
      <div class="bg-gray-100 rounded-lg p-4 mb-4">
        <p class="text-lg">${escapeHtml(data.sentence)}</p>
      </div>
    `;
    answerHtml = renderChoices(data.choices, "q0");
  } else if (part === 6) {
    html = `
      <h3 class="font-bold text-lg mb-3">Part 6 — 長文穴埋め問題</h3>
      <div class="bg-gray-100 rounded-lg p-4 mb-4 whitespace-pre-line">${escapeHtml(data.passage)}</div>
    `;
    answerHtml = data.questions
      .map(
        (q, i) => `
      <div class="mb-4">
        <p class="font-medium mb-2">空所 [${q.blank}]</p>
        ${renderChoices(q.choices, "q" + i)}
      </div>
    `
      )
      .join("");
  } else if (part === 7) {
    html = `
      <h3 class="font-bold text-lg mb-3">Part 7 — 読解問題</h3>
      <div class="bg-gray-100 rounded-lg p-4 mb-4 whitespace-pre-line">${escapeHtml(data.passage)}</div>
    `;
    answerHtml = renderMultiQuestions(data.questions);
  }

  display.innerHTML = html;
  answerArea.innerHTML = answerHtml;
}

function renderChoices(choices, key) {
  return `<div class="space-y-2" data-key="${key}">
    ${Object.entries(choices)
      .map(
        ([k, v]) => `
      <button class="choice-btn" data-key="${key}" data-value="${k}" onclick="selectChoice('${key}','${k}')">
        <span class="font-bold mr-2">(${k})</span> ${escapeHtml(v)}
      </button>`
      )
      .join("")}
  </div>`;
}

function renderMultiQuestions(questions) {
  return questions
    .map(
      (q, i) => `
    <div class="mb-5">
      <p class="font-medium mb-2">${escapeHtml(q.question)}</p>
      ${renderChoices(q.choices, "q" + i)}
    </div>
  `
    )
    .join("");
}

function selectChoice(key, value) {
  userAnswers[key] = value;
  document.querySelectorAll(`[data-key="${key}"]`).forEach((btn) => {
    if (btn.classList.contains("choice-btn")) {
      btn.classList.toggle("selected", btn.dataset.value === value);
    }
  });
  checkAllAnswered();
}

function checkAllAnswered() {
  const part = currentProblem.part;
  const data = currentProblem.data;
  let needed = 0;
  if ([1, 2, 5].includes(part)) needed = 1;
  else if ([3, 4, 7].includes(part)) needed = data.questions.length;
  else if (part === 6) needed = data.questions.length;

  document.getElementById("submitBtn").disabled =
    Object.keys(userAnswers).length < needed;
}

// ── Submit answer ────────────────────────────────────────

async function submitAnswer() {
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 採点・解説生成中...';

  try {
    const resp = await apiFetch("/api/answer", {
      method: "POST",
      body: JSON.stringify({
        problem_id: currentProblem.id,
        part: currentProblem.part,
        user_answers: userAnswers,
        problem_data: currentProblem.data,
      }),
    });

    renderResults(resp);
    document.getElementById("submitSection").classList.add("hidden");
    document.getElementById("resultArea").classList.remove("hidden");
  } catch (e) {
    btn.textContent = "エラー: " + e.message;
  }
}

function renderResults(resp) {
  const results = resp.results || [];
  const explanation = resp.explanation || {};

  // Mark choices correct/incorrect
  results.forEach((r, i) => {
    const key = "q" + i;
    document.querySelectorAll(`button[data-key="${key}"]`).forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.value === r.correct_answer) {
        btn.classList.add("correct");
      }
      if (btn.dataset.value === r.user_answer && !r.is_correct) {
        btn.classList.add("incorrect");
      }
    });
  });

  // Result summary
  const correct = results.filter((r) => r.is_correct).length;
  const total = results.length;
  const resultDisplay = document.getElementById("resultDisplay");
  resultDisplay.innerHTML = `
    <div class="flex items-center gap-3 mb-2">
      <span class="text-2xl font-bold ${correct === total ? "text-green-600" : "text-amber-600"}">
        ${correct} / ${total} 正解
      </span>
      ${correct === total ? '<span class="badge badge-green">全問正解!</span>' : ""}
    </div>
  `;

  // Explanation
  const expDisplay = document.getElementById("explanationDisplay");
  let expHtml = '<h3 class="font-bold text-lg mb-4">解説</h3>';

  if (explanation.overall_translation) {
    expHtml += `
      <div class="bg-blue-50 rounded-lg p-4 mb-4 selectable-text">
        <p class="text-sm font-semibold text-blue-700 mb-1">全体の和訳</p>
        <p class="text-gray-700">${escapeHtml(explanation.overall_translation)}</p>
      </div>`;
  }

  if (explanation.explanations) {
    explanation.explanations.forEach((ex) => {
      const icon = ex.is_correct ? "✓" : "✗";
      const color = ex.is_correct ? "green" : "red";
      expHtml += `
        <div class="mb-4 p-4 rounded-lg border ${ex.is_correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"} selectable-text">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-${color}-600 font-bold">${icon}</span>
            <span class="font-medium selectable-text">${escapeHtml(ex.question_text || "")}</span>
          </div>
          ${ex.translation ? `<p class="text-sm text-gray-600 mb-2 selectable-text">和訳: ${escapeHtml(ex.translation)}</p>` : ""}
          <p class="text-sm mb-1">正解: <strong>(${escapeHtml(ex.correct_answer)})</strong> / あなたの回答: <strong>(${escapeHtml(ex.user_answer)})</strong></p>
          <p class="text-sm text-gray-700 selectable-text">${escapeHtml(ex.explanation || "")}</p>
        </div>`;
    });
  }

  if (explanation.key_vocabulary && explanation.key_vocabulary.length > 0) {
    expHtml += '<h4 class="font-bold mt-4 mb-2">重要単語</h4><div class="space-y-2">';
    explanation.key_vocabulary.forEach((v) => {
      expHtml += `
        <div class="flex items-start gap-2 text-sm selectable-text">
          <span class="font-bold text-primary-700 selectable-text">${escapeHtml(v.word)}</span>
          <span class="text-gray-600 selectable-text">— ${escapeHtml(v.meaning)}</span>
        </div>`;
    });
    expHtml += "</div>";
  }

  if (explanation.grammar_points && explanation.grammar_points.length > 0) {
    expHtml += '<h4 class="font-bold mt-4 mb-2">文法ポイント</h4><ul class="list-disc pl-5 space-y-1 text-sm text-gray-700">';
    explanation.grammar_points.forEach((g) => {
      expHtml += `<li class="selectable-text">${escapeHtml(g)}</li>`;
    });
    expHtml += "</ul>";
  }

  if (explanation.error) {
    expHtml += `<p class="text-red-500">${escapeHtml(explanation.error)}</p>`;
  }

  expDisplay.innerHTML = expHtml;
}

// ── Audio ────────────────────────────────────────────────

async function playAudio() {
  const btn = document.getElementById("playAudioBtn");
  const text = document.getElementById("audioSection").dataset.text;
  if (!text) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 音声を生成中...';

  try {
    const resp = await apiFetch("/api/tts", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    if (resp.url) {
      const audio = document.getElementById("audioPlayer");
      audio.src = resp.url;
      audio.play();
      btn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15z"/>
        </svg>
        もう一度再生`;
    } else {
      btn.textContent = "エラー: " + (resp.error || "不明");
    }
  } catch (e) {
    btn.textContent = "エラー: " + e.message;
  }
  btn.disabled = false;
}

// ── Vocab popup on text selection ────────────────────────

let selectedText = "";
let contextSentence = "";

document.addEventListener("mouseup", (e) => {
  const sel = window.getSelection();
  const text = sel.toString().trim();
  const popup = document.getElementById("vocabPopup");

  if (
    text &&
    text.length > 0 &&
    text.length < 50 &&
    e.target.closest(".selectable-text")
  ) {
    selectedText = text;
    // Get the surrounding sentence as context
    const parentEl = e.target.closest(".selectable-text");
    contextSentence = parentEl ? parentEl.textContent.trim() : "";

    const rect = sel.getRangeAt(0).getBoundingClientRect();
    popup.style.top = rect.bottom + window.scrollY + 8 + "px";
    popup.style.left = rect.left + window.scrollX + "px";
    document.getElementById("vocabWord").textContent = text;
    popup.classList.remove("hidden");
  } else if (!e.target.closest(".vocab-popup")) {
    popup.classList.add("hidden");
  }
});

function closeVocabPopup() {
  document.getElementById("vocabPopup").classList.add("hidden");
}

async function addToVocab() {
  const popup = document.getElementById("vocabPopup");
  const wordEl = document.getElementById("vocabWord");
  wordEl.textContent = "追加中...";

  try {
    await apiFetch("/api/vocabulary", {
      method: "POST",
      body: JSON.stringify({
        word: selectedText,
        context_sentence: contextSentence,
      }),
    });
    wordEl.textContent = "追加しました!";
    setTimeout(() => popup.classList.add("hidden"), 1000);
  } catch (e) {
    wordEl.textContent = "エラー";
  }
}
