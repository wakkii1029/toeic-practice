/* ── Problems list page logic ────────────────────────────── */

let allProblems = [];
let currentProblemId = null;

const PART_NAMES = {
  1: "Part 1 写真描写",
  2: "Part 2 応答",
  3: "Part 3 会話",
  4: "Part 4 説明文",
  5: "Part 5 短文穴埋め",
  6: "Part 6 長文穴埋め",
  7: "Part 7 読解",
};

const SECTION_MAP = {
  1: "Listening", 2: "Listening", 3: "Listening", 4: "Listening",
  5: "Reading", 6: "Reading", 7: "Reading",
};

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

// ── Load & render ────────────────────────────────────────

async function loadProblems() {
  allProblems = await apiFetch("/api/problems");
  // Sort newest first
  allProblems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  filterProblems();
}

function filterProblems() {
  const partFilter = document.getElementById("partFilter").value;
  const statusFilter = document.getElementById("statusFilter").value;

  let filtered = allProblems;

  if (partFilter !== "all") {
    filtered = filtered.filter((p) => p.part === parseInt(partFilter));
  }

  if (statusFilter === "unanswered") {
    filtered = filtered.filter((p) => (p.stats?.attempts || 0) === 0);
  } else if (statusFilter === "answered") {
    filtered = filtered.filter((p) => (p.stats?.attempts || 0) > 0);
  }

  document.getElementById("problemCount").textContent =
    `${filtered.length} / ${allProblems.length} 件`;

  const container = document.getElementById("problemList");

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="text-center text-gray-400 py-12">問題がありません</div>';
    return;
  }

  container.innerHTML = filtered.map((p) => {
    const stats = p.stats || { attempts: 0, correct: 0, wrong: 0 };
    const date = new Date(p.created_at).toLocaleString("ja-JP");
    const section = SECTION_MAP[p.part] || "";
    const sectionClass = section === "Listening" ? "badge-blue" : "badge-green";
    const preview = getPreview(p);

    let statsHtml = "";
    if (stats.attempts > 0) {
      statsHtml = `
        <span class="badge badge-gray">${stats.attempts}回解答</span>
        <span class="badge badge-green">${stats.correct}正解</span>
        ${stats.wrong > 0 ? `<span class="badge badge-red">${stats.wrong}不正解</span>` : ""}
      `;
    } else {
      statsHtml = '<span class="badge badge-gray">未回答</span>';
    }

    return `
      <div class="card mb-3 cursor-pointer hover:border-primary-300 transition-colors"
           onclick='showDetail("${p.id}")'>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="badge ${sectionClass}">${section}</span>
            <span class="font-semibold">${PART_NAMES[p.part] || "Part " + p.part}</span>
          </div>
          <span class="text-sm text-gray-400">${date}</span>
        </div>
        <div class="text-sm text-gray-600 mb-2 truncate">${preview}</div>
        <div class="flex items-center gap-2">${statsHtml}</div>
      </div>`;
  }).join("");
}

function getPreview(p) {
  const d = p.data;
  if (d.sentence) return escapeHtml(d.sentence);
  if (d.question) return escapeHtml(d.question);
  if (d.scene_description) return escapeHtml(d.scene_description.substring(0, 120) + "...");
  if (d.conversation) return escapeHtml(d.conversation.substring(0, 120) + "...");
  if (d.talk) return escapeHtml(d.talk.substring(0, 120) + "...");
  if (d.passage) return escapeHtml(d.passage.substring(0, 120) + "...");
  return "";
}

// ── Detail modal ─────────────────────────────────────────

function showDetail(id) {
  const p = allProblems.find((x) => x.id === id);
  if (!p) return;
  currentProblemId = id;

  document.getElementById("detailTitle").textContent =
    PART_NAMES[p.part] || "Part " + p.part;

  const d = p.data;
  let html = "";

  if (p.part === 1) {
    html = `
      <div class="mb-3"><span class="text-sm font-semibold text-gray-500">Scene Description:</span></div>
      <div class="bg-gray-100 rounded-lg p-4 mb-3 italic">${escapeHtml(d.scene_description || "")}</div>
      ${renderChoicesReadonly(d.choices, d.answer)}
    `;
  } else if (p.part === 2) {
    html = `
      <div class="bg-gray-100 rounded-lg p-4 mb-3 font-medium">${escapeHtml(d.question || "")}</div>
      ${renderChoicesReadonly(d.choices, d.answer)}
    `;
  } else if (p.part === 3) {
    html = `
      <div class="bg-gray-100 rounded-lg p-4 mb-3 whitespace-pre-line">${escapeHtml(d.conversation || "")}</div>
      ${(d.questions || []).map((q, i) => `
        <div class="mb-3">
          <p class="font-medium mb-1">${escapeHtml(q.question)}</p>
          ${renderChoicesReadonly(q.choices, q.answer)}
        </div>
      `).join("")}
    `;
  } else if (p.part === 4) {
    html = `
      <div class="bg-gray-100 rounded-lg p-4 mb-3 whitespace-pre-line">${escapeHtml(d.talk || "")}</div>
      ${(d.questions || []).map((q, i) => `
        <div class="mb-3">
          <p class="font-medium mb-1">${escapeHtml(q.question)}</p>
          ${renderChoicesReadonly(q.choices, q.answer)}
        </div>
      `).join("")}
    `;
  } else if (p.part === 5) {
    html = `
      <div class="bg-gray-100 rounded-lg p-4 mb-3 text-lg">${escapeHtml(d.sentence || "")}</div>
      ${renderChoicesReadonly(d.choices, d.answer)}
    `;
  } else if (p.part === 6) {
    html = `
      <div class="bg-gray-100 rounded-lg p-4 mb-3 whitespace-pre-line">${escapeHtml(d.passage || "")}</div>
      ${(d.questions || []).map((q, i) => `
        <div class="mb-3">
          <p class="font-medium mb-1">空所 [${q.blank}]</p>
          ${renderChoicesReadonly(q.choices, q.answer)}
        </div>
      `).join("")}
    `;
  } else if (p.part === 7) {
    html = `
      <div class="bg-gray-100 rounded-lg p-4 mb-3 whitespace-pre-line">${escapeHtml(d.passage || "")}</div>
      ${(d.questions || []).map((q, i) => `
        <div class="mb-3">
          <p class="font-medium mb-1">${escapeHtml(q.question)}</p>
          ${renderChoicesReadonly(q.choices, q.answer)}
        </div>
      `).join("")}
    `;
  }

  // Stats
  const stats = p.stats || { attempts: 0, correct: 0, wrong: 0 };
  if (stats.attempts > 0) {
    html += `
      <div class="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
        <span class="font-semibold">解答履歴:</span>
        ${stats.attempts}回解答 / ${stats.correct}正解 / ${stats.wrong}不正解
      </div>`;
  }

  document.getElementById("detailContent").innerHTML = html;
  document.getElementById("detailModal").classList.remove("hidden");
}

function renderChoicesReadonly(choices, answer) {
  if (!choices) return "";
  return `<div class="space-y-1 ml-2">
    ${Object.entries(choices).map(([k, v]) => {
      const isAnswer = k === answer;
      return `<div class="text-sm py-1 ${isAnswer ? "font-bold text-green-700" : "text-gray-600"}">
        (${k}) ${escapeHtml(v)} ${isAnswer ? "← 正解" : ""}
      </div>`;
    }).join("")}
  </div>`;
}

function closeDetail() {
  document.getElementById("detailModal").classList.add("hidden");
  currentProblemId = null;
}

async function deleteProblem() {
  if (!currentProblemId) return;
  if (!confirm("この問題を削除しますか？関連する解答履歴も削除されます。")) return;

  await apiFetch(`/api/problems/${currentProblemId}`, { method: "DELETE" });
  closeDetail();
  await loadProblems();
}

// ── Init ─────────────────────────────────────────────────
loadProblems();
