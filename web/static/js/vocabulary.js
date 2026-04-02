/* ── Vocabulary page logic ───────────────────────────────── */

let vocabData = [];
let currentWord = null;

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

// ── Load vocabulary ──────────────────────────────────────

async function loadVocab() {
  vocabData = await apiFetch("/api/vocabulary");
  filterVocab();
}

function filterVocab() {
  const search = document.getElementById("vocabSearch").value.toLowerCase();
  const showMastered = document.getElementById("showMastered").checked;

  let filtered = vocabData;
  if (search) {
    filtered = filtered.filter(
      (v) =>
        v.word.toLowerCase().includes(search) ||
        (v.explanation?.meaning || "").toLowerCase().includes(search)
    );
  }
  if (!showMastered) {
    filtered = filtered.filter((v) => !v.mastered);
  }

  document.getElementById("vocabCount").textContent = `${filtered.length} / ${vocabData.length} 件`;

  const container = document.getElementById("vocabList");
  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="text-center text-gray-400 py-12">単語がありません</div>';
    return;
  }

  container.innerHTML = filtered
    .map(
      (v) => `
    <div class="card mb-3 cursor-pointer hover:border-primary-300 transition-colors flex items-center justify-between"
         onclick='openWord(${JSON.stringify(v.id)})'>
      <div class="flex items-center gap-4">
        ${v.mastered ? '<span class="badge badge-green">習得済</span>' : '<span class="badge badge-gray">未習得</span>'}
        <div>
          <span class="font-bold text-lg">${escapeHtml(v.word)}</span>
          <span class="text-gray-500 ml-3">${escapeHtml(v.explanation?.meaning || "")}</span>
        </div>
      </div>
      <div class="text-sm text-gray-400">${escapeHtml(v.explanation?.part_of_speech || "")}</div>
    </div>`
    )
    .join("");
}

// ── Add word manually ────────────────────────────────────

async function addWordManual() {
  const wordInput = document.getElementById("newWord");
  const contextInput = document.getElementById("newContext");
  const btn = document.getElementById("addWordBtn");
  const word = wordInput.value.trim();
  if (!word) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    await apiFetch("/api/vocabulary", {
      method: "POST",
      body: JSON.stringify({
        word,
        context_sentence: contextInput.value.trim(),
      }),
    });
    wordInput.value = "";
    contextInput.value = "";
    await loadVocab();
  } catch (e) {
    alert("エラー: " + e.message);
  }

  btn.disabled = false;
  btn.textContent = "追加";
}

// ── Word detail modal ────────────────────────────────────

function openWord(id) {
  currentWord = vocabData.find((v) => v.id === id);
  if (!currentWord) return;

  const modal = document.getElementById("wordModal");
  document.getElementById("modalWordTitle").textContent = currentWord.word;

  const exp = currentWord.explanation || {};
  let html = "";

  if (exp.pronunciation) {
    html += `<p class="text-gray-500 mb-2">${escapeHtml(exp.pronunciation)} — ${escapeHtml(exp.part_of_speech || "")}</p>`;
  }
  if (exp.meaning) {
    html += `<p class="text-lg font-medium mb-3">${escapeHtml(exp.meaning)}</p>`;
  }

  if (currentWord.context_sentence) {
    html += `
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
        <p class="text-xs text-yellow-600 font-semibold mb-1">出題文</p>
        <p class="text-sm">${escapeHtml(currentWord.context_sentence)}</p>
      </div>`;
  }

  if (exp.example_sentences && exp.example_sentences.length > 0) {
    html += '<div class="mb-3"><p class="text-sm font-semibold text-gray-500 mb-1">例文</p>';
    exp.example_sentences.forEach((s) => {
      html += `
        <div class="mb-2 pl-3 border-l-2 border-primary-200">
          <p class="text-sm">${escapeHtml(s.en)}</p>
          <p class="text-sm text-gray-500">${escapeHtml(s.ja)}</p>
        </div>`;
    });
    html += "</div>";
  }

  if (exp.synonyms && exp.synonyms.length > 0) {
    html += `
      <div class="mb-3">
        <p class="text-sm font-semibold text-gray-500 mb-1">類義語</p>
        <div class="flex flex-wrap gap-1">
          ${exp.synonyms.map((s) => `<span class="badge badge-blue">${escapeHtml(s)}</span>`).join("")}
        </div>
      </div>`;
  }

  if (exp.toeic_tips) {
    html += `
      <div class="bg-blue-50 rounded-lg p-3">
        <p class="text-xs text-blue-600 font-semibold mb-1">TOEIC Tips</p>
        <p class="text-sm text-gray-700">${escapeHtml(exp.toeic_tips)}</p>
      </div>`;
  }

  document.getElementById("modalContent").innerHTML = html;
  document.getElementById("modalNotes").value = currentWord.user_notes || "";
  document.getElementById("masteredBtnText").textContent = currentWord.mastered
    ? "未習得に戻す"
    : "習得済みにする";

  modal.classList.remove("hidden");
}

function closeWordModal() {
  document.getElementById("wordModal").classList.add("hidden");
  currentWord = null;
}

async function saveNotes() {
  if (!currentWord) return;
  const notes = document.getElementById("modalNotes").value;
  await apiFetch(`/api/vocabulary/${currentWord.id}`, {
    method: "PUT",
    body: JSON.stringify({ user_notes: notes }),
  });
  currentWord.user_notes = notes;
  await loadVocab();
}

async function toggleMastered() {
  if (!currentWord) return;
  const mastered = !currentWord.mastered;
  await apiFetch(`/api/vocabulary/${currentWord.id}`, {
    method: "PUT",
    body: JSON.stringify({ mastered }),
  });
  currentWord.mastered = mastered;
  document.getElementById("masteredBtnText").textContent = mastered
    ? "未習得に戻す"
    : "習得済みにする";
  await loadVocab();
}

async function deleteWordConfirm() {
  if (!currentWord) return;
  if (!confirm(`「${currentWord.word}」を削除しますか？`)) return;
  await apiFetch(`/api/vocabulary/${currentWord.id}`, { method: "DELETE" });
  closeWordModal();
  await loadVocab();
}

// ── Init ─────────────────────────────────────────────────
loadVocab();
