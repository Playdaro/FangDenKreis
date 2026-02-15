// main.js
// Zentrale App-Logik: Navigation + Difficulty-Auswahl

import { showScreen } from "./screens.js";
import { openDifficultySelect } from "./difficultySelect.js";
import { bindResultButtons } from "./result.js";

/* ======================================================
   OVERLOAD CONTROL
   ====================================================== */
import { startEasy as startOverloadEasy } 
  from "./overloadControl/overloadControlEasy.js";

import { startMedium as startOverloadMedium } 
  from "./overloadControl/overloadControlMedium.js";

import { startHard as startOverloadHard } 
  from "./overloadControl/overloadControlHard.js";

/* ======================================================
   HELPER
   ====================================================== */
const qs = (id) => document.getElementById(id);

/* ======================================================
   PLAYER NAME FLOW
   ====================================================== */
const savedName = localStorage.getItem("brc_player_name");
if (savedName) {
  window.playerName = savedName;
  const input = qs("name-input");
  if (input) input.value = savedName;
}

qs("info-continue")?.addEventListener("click", () => {
  if (localStorage.getItem("brc_player_name")) {
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

/* ======================================================
   RESULT BUTTONS – OVERLOAD
   ====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  bindResultButtons({
    menuBtnId: "overload-res-menu",
    retryBtnId: "overload-res-retry",
    onRetry: () => {
      const diff = window.lastOverloadDifficulty || "easy";
      if (diff === "easy") startOverloadEasy();
      else if (diff === "medium") startOverloadMedium();
      else startOverloadHard();
    },
    menuKey: "menu",
  });
});

/* ======================================================
   MENU → VISUAL
   ====================================================== */

import {
  startEasy as startVisualEasy,
  startMedium as startVisualMedium,
  startHard as startVisualHard
} from "./visual/visualRunner.js";


qs("btn-visual")?.addEventListener("click", () => {
  openDifficultySelect({
    modeKey: "visual",
    onStart: {
      easy: () => {
        window.lastVisualDifficulty = "easy";
        startVisualEasy();
      },
      medium: () => {
        window.lastVisualDifficulty = "medium";
        startVisualMedium();
      },
      hard: () => {
        window.lastVisualDifficulty = "hard";
        startVisualHard();
      },
    },
  });
});



/* ======================================================
   MENU → OVERLOAD
   ====================================================== */
qs("btn-overload")?.addEventListener("click", () => {
  openDifficultySelect({
    modeKey: "overload",
    onStart: {
      easy: () => {
        window.lastOverloadDifficulty = "easy";
        startOverloadEasy();
      },
      medium: () => {
        window.lastOverloadDifficulty = "medium";
        startOverloadMedium();
      },
      hard: () => {
        window.lastOverloadDifficulty = "hard";
        startOverloadHard();
      },
    },
  });
});

/* ======================================================
   MODAL CLOSE (X)
   ====================================================== */
document.querySelectorAll(".modal .modal-close").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const modal = e.target.closest(".modal");
    if (modal) modal.style.display = "none";
  });
});


(function initFullscreenButton(){
  const btn = document.getElementById("btn-fullscreen");
  if (!btn) return;

  // Wenn Fullscreen API fehlt: Button ausblenden
  const canFullscreen = !!document.documentElement.requestFullscreen && !!document.exitFullscreen;
  if (!canFullscreen) {
    btn.classList.add("hidden");
    return;
  }

  const setIcon = () => {
    const isFs = !!document.fullscreenElement;
    btn.textContent = isFs ? "❎" : "⛶";
    btn.title = isFs ? "Vollbild verlassen" : "Vollbild";
    btn.setAttribute("aria-label", isFs ? "Vollbild verlassen" : "Vollbild aktivieren");
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      // Wenn Browser blockt (z.B. iOS), einfach nix tun
      console.warn("[fullscreen] toggle failed:", e);
    } finally {
      setIcon();
    }
  };

  btn.addEventListener("click", toggleFullscreen);

  // Icon bei ESC/Browser-Aktionen automatisch updaten
  document.addEventListener("fullscreenchange", setIcon);

  // Initialer Zustand
  setIcon();
})();

