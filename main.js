// main.js
// Zentrale App-Logik (NUR Navigation + Modals)

import { showScreen } from "./screens.js";

// Helper
const qs = (id) => document.getElementById(id);

// ======================================================
// LOAD SAVED PLAYER NAME  ← GENAU HIER REIN
// ======================================================
const savedName = localStorage.getItem("brc_player_name");
if (savedName) {
  window.playerName = savedName;

  const input = qs("name-input");
  if (input) input.value = savedName;
}

// ======================================================
// INFO → NAME → MENU
// ======================================================
qs("info-continue")?.addEventListener("click", () => {
  const savedName = localStorage.getItem("brc_player_name");
  if (savedName) {
    window.playerName = savedName;
    showScreen("menu");
  } else {
    showScreen("name");
  }
});

qs("name-submit")?.addEventListener("click", () => {
  const name = qs("name-input")?.value?.trim();
  if (!name) return;

  window.playerName = name;
  localStorage.setItem("brc_player_name", name);

  showScreen("menu");
});

// ======================================================
// MENU → MODAL / RUNNER-ENTRY
// ======================================================

// VISUAL
qs("btn-visual")?.addEventListener("click", () => {
  qs("visual-modal")?.style && (qs("visual-modal").style.display = "flex");
});

// SOUND
qs("btn-audio")?.addEventListener("click", () => {
  qs("audio-modal")?.style && (qs("audio-modal").style.display = "flex");
});

// GRID (3×3)
qs("btn-grid")?.addEventListener("click", () => {
  qs("grid-modal")?.style && (qs("grid-modal").style.display = "flex");
});

// GRID TIMING
qs("btn-gridtiming")?.addEventListener("click", () => {
  qs("gridtiming-modal")?.style && (qs("gridtiming-modal").style.display = "flex");
});

// MEMORY (Simon)
qs("btn-memory")?.addEventListener("click", () => {
  qs("memory-modal")?.style && (qs("memory-modal").style.display = "flex");
});

// MIND SWITCH
//qs("btn-mind")?.addEventListener("click", () => {
//  qs("mind-modal")?.style && (qs("mind-modal").style.display = "flex");
//});

// SHAPE SHIFT


// MAZE (vollständig im Runner geregelt)
qs("btn-maze")?.addEventListener("click", () => {
  // reactionMazeRunner übernimmt alles Weitere
  const modal = qs("maze-modal");
  if (modal) modal.style.display = "flex";
});

// ======================================================
// GLOBAL: MODAL CLOSE BUTTONS (X)
// ======================================================

document.querySelectorAll(".modal .modal-close").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const modal = e.target.closest(".modal");
    if (modal) modal.style.display = "none";
  });
});
