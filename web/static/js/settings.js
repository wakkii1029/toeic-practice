/* ── Settings page logic ─────────────────────────────────── */

async function apiFetch(url, opts = {}) {
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return resp.json();
}

// ── Load settings ────────────────────────────────────────

async function loadSettings() {
  const cfg = await apiFetch("/api/settings");

  // Provider
  document.querySelectorAll('input[name="provider"]').forEach((el) => {
    el.checked = el.value === cfg.provider;
  });
  onProviderChange();

  // Ollama
  document.getElementById("ollamaUrl").value =
    cfg.ollama_base_url || "http://localhost:11434";

  // OpenAI
  document.getElementById("openaiUrl").value =
    cfg.openai_base_url || "https://api.openai.com/v1";
  document.getElementById("openaiKey").value = cfg.openai_api_key || "";
  document.getElementById("openaiModel").value = cfg.openai_model || "gpt-4o-mini";

  // TTS
  document.getElementById("ttsVoice").value =
    cfg.tts_voice || "en-US-AriaNeural";
  document.getElementById("ttsRate").value = cfg.tts_rate || "-10%";

  // Load Ollama models
  await refreshModels(cfg.ollama_model);
}

function onProviderChange() {
  const provider = document.querySelector('input[name="provider"]:checked')?.value;
  document.getElementById("ollamaSettings").classList.toggle("hidden", provider !== "ollama");
  document.getElementById("openaiSettings").classList.toggle("hidden", provider !== "openai");
}

async function refreshModels(selectModel) {
  const select = document.getElementById("ollamaModel");
  select.innerHTML = '<option value="">読み込み中...</option>';

  const models = await apiFetch("/api/ollama-models");
  if (models.length === 0) {
    select.innerHTML =
      '<option value="">モデルが見つかりません（Ollamaが起動していますか？）</option>';
    return;
  }

  select.innerHTML = models
    .map((m) => `<option value="${m}" ${m === selectModel ? "selected" : ""}>${m}</option>`)
    .join("");
}

// ── Save settings ────────────────────────────────────────

async function saveSettings() {
  const provider = document.querySelector('input[name="provider"]:checked')?.value;

  const cfg = {
    provider,
    ollama_base_url: document.getElementById("ollamaUrl").value.trim(),
    ollama_model: document.getElementById("ollamaModel").value,
    openai_base_url: document.getElementById("openaiUrl").value.trim(),
    openai_api_key: document.getElementById("openaiKey").value.trim(),
    openai_model: document.getElementById("openaiModel").value.trim(),
    tts_voice: document.getElementById("ttsVoice").value,
    tts_rate: document.getElementById("ttsRate").value,
  };

  await apiFetch("/api/settings", {
    method: "POST",
    body: JSON.stringify(cfg),
  });

  const status = document.getElementById("saveStatus");
  status.classList.remove("hidden");
  setTimeout(() => status.classList.add("hidden"), 2000);
}

// ── Init ─────────────────────────────────────────────────
loadSettings();
