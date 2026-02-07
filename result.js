// result.js — FINAL
// Zweck:
// - Zentrale Result-Helfer
// - Einheitliche Text-/HTML-Setter
// - Einheitliche Difficulty-Anzeige (easy → Einfach, …)
// - Robustes Binden von Retry/Menu Buttons

import { showScreen } from "./screens.js";

// ======================================================
// Difficulty-Labels (UI)
// ======================================================

const DIFF_LABELS = {
  easy: "Einfach",
  medium: "Mittel",
  hard: "Schwer",
};

export function formatDifficulty(diffKey) {
  return DIFF_LABELS[diffKey] || diffKey || "–";
}

// ======================================================
// Helper
// ======================================================

export function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.textContent = value == null ? "" : String(value);
  return true;
}

export function setHTML(id, html) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.innerHTML = html == null ? "" : String(html);
  return true;
}

export function fmtMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return "–";
  return `${Math.round(n)} ms`;
}

export function fmtSec(msOrSec, digits = 2, input = "ms") {
  const n = Number(msOrSec);
  if (!Number.isFinite(n)) return "–";
  const sec = input === "ms" ? n / 1000 : n;
  return sec.toFixed(digits);
}

// ======================================================
// Result Buttons
// ======================================================

/**
 * Bindet "Menu" und "Retry" Buttons robust.
 * - Nutzt onclick (kein Listener-Chaos bei Reloads)
 *
 * @param {Object} opts
 * @param {string} opts.menuBtnId
 * @param {string} opts.retryBtnId
 * @param {Function} opts.onRetry
 * @param {string} [opts.menuKey="menu"]
 */
export function bindResultButtons({
  menuBtnId,
  retryBtnId,
  onRetry,
  menuKey = "menu",
}) {
  const menuBtn = document.getElementById(menuBtnId);
  const retryBtn = document.getElementById(retryBtnId);

  if (menuBtn) {
    menuBtn.onclick = () => {
      try {
        showScreen(menuKey);
      } catch (e) {
        console.error("[result] showScreen(menu) failed:", e);
      }
    };
  } else {
    console.warn("[result] Menu button not found:", menuBtnId);
  }

  if (retryBtn) {
    retryBtn.onclick = async () => {
      try {
        await onRetry?.();
      } catch (e) {
        console.error("[result] Retry failed:", e);
      }
    };
  } else {
    console.warn("[result] Retry button not found:", retryBtnId);
  }
}

// ======================================================
// Komfort-Funktion
// ======================================================

/**
 * Optional: Werte setzen + Screen zeigen + Buttons binden
 *
 * @param {Object} opts
 * @param {string} opts.resultScreenKey
 * @param {Array<[string, any]>} [opts.fields]
 * @param {string} opts.menuBtnId
 * @param {string} opts.retryBtnId
 * @param {Function} opts.onRetry
 * @param {string} [opts.menuKey="menu"]
 */
export function showResult({
  resultScreenKey,
  fields = [],
  menuBtnId,
  retryBtnId,
  onRetry,
  menuKey = "menu",
}) {
  for (const [id, val] of fields) setText(id, val);
  bindResultButtons({ menuBtnId, retryBtnId, onRetry, menuKey });
  showScreen(resultScreenKey);
}
