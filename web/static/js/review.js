/* ── Review page logic ───────────────────────────────────── */

let wrongAnswers = [];
let currentReview = null;
let reviewAnswers = {};

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

const PART_NAMES = {
  1: "Part 1 写真描写",
  2: "Part 2 応答",
  3: "Part 3 会話",
  4: "Part 4 説明文",
  5: "Part 5 短文穴埋め",
  6: "Part 6 長文穴埋め",
  7: "Part 7 読解",
};

// ── Load wrong answers ───────────────────────────────────

async function loadWrongAnswers() {
  document.getElementById("wrongList").innerHTML =
    '<div class="text-center text-gray-400 py-8"><span class="spinner"></span> 読み込み中...</div>';
  wrongAnswers = await apiFetch("/api/wrong-answers");
  filterWrong();
}

function filterWrong() {
  const filter = document.getElementById("partFilter").value;
  let filtered = wrongAnswers;
  if (filter !== "all") {
    filtered = wrongAnswers.filter((w) => w.part === parseInt(filter));
  }

  const container = document.getElementById("wrongList");
  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="text-center text-gray-400 py-12">間違えた問題はありません</div>';
    return;
  }

  container.innerHTML = filtered
    .map((rec) => {
      const wrong = rec.results.filter((r) => !r.is_correct).length;
      const total = rec.results.length;
      const date = new Date(rec.answered_at).toLocaleString("ja-JP");
      return `
      <div class="card mb-3 cursor-pointer hover:border-primary-300 transition-colors" onclick='startReview(${JSON.stringify(rec).replace(/'/g, "&#39;")})'>
        <div class="flex items-center justify-between">
          <div>
            <span class="badge badge-blue mr-2">${PART_NAMES[rec.part] || "Part " + rec.part}</span>
            <span class="badge badge-red">${wrong}問不正解</span>
          </div>
          <span class="text-sm text-gray-400">${date}</span>
        </div>
        <div class="mt-2 text-sm text-gray-600 truncate">
          ${getPreview(rec)}
        </div>
      </div>`;
    })
    .join("");
}

function getPreview(rec) {
  const d = rec.problem_data;
  if (d.sentence) return escapeHtml(d.sentence);
  if (d.question) return escapeHtml(d.question);
  if (d.conversation)
    return escapeHtml(d.conversation.substring(0, 100) + "...");
  if (d.passage) return escapeHtml(d.passage.substring(0, 100) + "...");
  if (d.talk) return escapeHtml(d.talk.substring(0, 100) + "...");
  if (d.scene_description) return escapeHtml(d.scene_description.substring(0, 100) + "...");
  return "";
}

// ── Start review ─────────────────────────────────────────

function startReview(rec) {
  currentReview = rec;
  reviewAnswers = {};
  document.getElementById("wrongList").classList.add("hidden");
  document.getElementById("reviewProblemArea").classList.remove("hidden");
  document.getElementById("reviewResultArea").classList.add("hidden");
  document.getElementById("reviewSubmitBtn").disabled = true;
  document.getElementById("reviewSubmitBtn").textContent = "回答する";

  const part = rec.part;
  const data = rec.problem_data;
  document.getElementById("reviewTitle").textContent =
    PART_NAMES[part] || "Part " + part;

  const display = document.getElementById("reviewProblemDisplay");
  const answerArea = document.getElementById("reviewAnswerArea");

  let html = "";
  let answerHtml = "";

  if (part === 1) {
    html = `<div class="bg-gray-100 rounded-lg p-4 italic text-gray-700">${escapeHtml(data.scene_description)}</div>`;
    answerHtml = renderChoices(data.choices, "q0");
  } else if (part === 2) {
    html = `<div class="bg-gray-100 rounded-lg p-4"><p class="font-medium">${escapeHtml(data.question)}</p></div>`;
    answerHtml = renderChoices(data.choices, "q0");
  } else if (part === 3) {
    html = `<div class="bg-gray-100 rounded-lg p-4 whitespace-pre-line">${escapeHtml(data.conversation)}</div>`;
    answerHtml = renderMultiQuestions(data.questions);
  } else if (part === 4) {
    html = `<div class="bg-gray-100 rounded-lg p-4 whitespace-pre-line">${escapeHtml(data.talk)}</div>`;
    answerHtml = renderMultiQuestions(data.questions);
  } else if (part === 5) {
    html = `<div class="bg-gray-100 rounded-lg p-4"><p class="text-lg">${escapeHtml(data.sentence)}</p></div>`;
    answerHtml = renderChoices(data.choices, "q0");
  } else if (part === 6) {
    html = `<div class="bg-gray-100 rounded-lg p-4 whitespace-pre-line">${escapeHtml(data.passage)}</div>`;
    answerHtml = data.questions
      .map(
        (q, i) => `
      <div class="mb-4">
        <p class="font-medium mb-2">空所 [${q.blank}]</p>
        ${renderChoices(q.choices, "q" + i)}
      </div>`
      )
      .join("");
  } else if (part === 7) {
    html = `<div class="bg-gray-100 rounded-lg p-4 whitespace-pre-line">${escapeHtml(data.passage)}</div>`;
    answerHtml = renderMultiQuestions(data.questions);
  }

  display.innerHTML = html;
  answerArea.innerHTML = answerHtml;
}

function renderChoices(choices, key) {
  return `<div class="space-y-2 mt-3" data-key="${key}">
    ${Object.entries(choices)
      .map(
        ([k, v]) => `
      <button class="choice-btn" data-key="${key}" data-value="${k}" onclick="selectReviewChoice('${key}','${k}')">
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
    </div>`
    )
    .join("");
}

function selectReviewChoice(key, value) {
  reviewAnswers[key] = value;
  document
    .querySelectorAll(`#reviewAnswerArea [data-key="${key}"].choice-btn`)
    .forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.value === value);
    });

  // Check if all answered
  const data = currentReview.problem_data;
  const part = currentReview.part;
  let needed = 0;
  if ([1, 2, 5].includes(part)) needed = 1;
  else if ([3, 4, 7].includes(part)) needed = data.questions.length;
  else if (part === 6) needed = data.questions.length;

  document.getElementById("reviewSubmitBtn").disabled =
    Object.keys(reviewAnswers).length < needed;
}

// ── Submit review ────────────────────────────────────────

async function submitReview() {
  const btn = document.getElementById("reviewSubmitBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 採点中...';

  try {
    const resp = await apiFetch("/api/answer", {
      method: "POST",
      body: JSON.stringify({
        problem_id: currentReview.problem_id,
        part: currentReview.part,
        user_answers: reviewAnswers,
        problem_data: currentReview.problem_data,
      }),
    });

    const results = resp.results || [];
    // Mark choices
    results.forEach((r, i) => {
      const key = "q" + i;
      document
        .querySelectorAll(
          `#reviewAnswerArea button[data-key="${key}"]`
        )
        .forEach((btn) => {
          btn.disabled = true;
          if (btn.dataset.value === r.correct_answer)
            btn.classList.add("correct");
          if (btn.dataset.value === r.user_answer && !r.is_correct)
            btn.classList.add("incorrect");
        });
    });

    const correct = results.filter((r) => r.is_correct).length;
    const total = results.length;
    const resultDisplay = document.getElementById("reviewResultDisplay");
    resultDisplay.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-2xl font-bold ${correct === total ? "text-green-600" : "text-amber-600"}">
          ${correct} / ${total} 正解
        </span>
        ${correct === total ? '<span class="badge badge-green">全問正解!</span>' : ""}
      </div>`;
    document.getElementById("reviewResultArea").classList.remove("hidden");
    btn.textContent = "完了";
  } catch (e) {
    btn.textContent = "エラー: " + e.message;
  }
}

function closeReview() {
  document.getElementById("reviewProblemArea").classList.add("hidden");
  document.getElementById("wrongList").classList.remove("hidden");
  loadWrongAnswers();
}

// ── Init ─────────────────────────────────────────────────
loadWrongAnswers();
