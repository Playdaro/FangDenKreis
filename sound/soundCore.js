// soundCore.js – GLOBAL-KONFORM (wie Grid / Simon) + BEWEGUNG + Größe pro Difficulty + INGAME BACK

import { showScreen } from "../screens.js";
import { endGame } from "../core.js";
import { setText } from "../result.js";

const $ = (id) => document.getElementById(id);
const now = () => performance.now();

// --------------------------------------------------
// CONFIG / HELPERS
// --------------------------------------------------
const COLOR_MAP = {
  rot:  { name: "Rot",  code: "#e74c3c" },
  grün: { name: "Grün", code: "#2ecc71" },
  gelb: { name: "Gelb", code: "#f1c40f" },
  blau: { name: "Blau", code: "#3498db" },
};

function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "de-DE";
    msg.rate = 2.0;
    window.speechSynthesis.speak(msg);
  } catch {}
}

function pickBallSizePx(cfg) {
  if (cfg?.ballSizePx) return cfg.ballSizePx;
  return window.matchMedia("(max-width: 768px)").matches ? 52 : 40;
}

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
export function startSoundColor(cfg) {
  showScreen("sound");

  const arena   = $("sd-arena");
  const scoreEl = $("sd-score");
  const missEl  = $("sd-misses");
  const timeEl  = $("sd-time");
  const hintEl  = $("sd-hint");
  const backBtn = $("sd-back");

  if (!arena) {
    console.warn("[Sound] #sd-arena fehlt");
    return;
  }

  // Alte Bälle entfernen (Hint bleibt)
  arena.querySelectorAll(".sd-ball").forEach(n => n.remove());

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------
  const totalMs       = cfg.totalMs || 30000;
  const ballCount     = Math.max(1, Math.min(4, cfg.count || 2));
  const speedPxPerSec = cfg.speedPxPerSec || 180;

  const playColors = (cfg.colors || ["rot"]).map(
    c => COLOR_MAP[(c || "").toLowerCase()] || COLOR_MAP.rot
  );

  let score = 0;
  let misses = 0;
  const rtSamples = [];

  let startTs = now();
  let endTs   = startTs + totalMs;
  let lastPromptTs = startTs;
  let currentTarget = null;

  const sizePx = pickBallSizePx(cfg);
  const r = sizePx / 2;

  const balls = [];

  let aborted = false;

  function updateHUD(tNow) {
    const remain = Math.max(0, endTs - tNow);
    if (timeEl)  timeEl.textContent  = String(Math.ceil(remain / 1000));
    if (scoreEl) scoreEl.textContent = String(score);
    if (missEl)  missEl.textContent  = String(misses);
  }

  // --------------------------------------------------
  // BALLS / PHYSICS
  // --------------------------------------------------
  function getArenaSize() {
    const rect = arena.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  let { w: arenaW, h: arenaH } = getArenaSize();

  function onResize() {
    const s = getArenaSize();
    arenaW = s.w;
    arenaH = s.h;
  }
  window.addEventListener("resize", onResize);

  function createBalls() {
    balls.length = 0;
    arena.querySelectorAll(".sd-ball").forEach(n => n.remove());

    const s = getArenaSize();
    arenaW = s.w;
    arenaH = s.h;

    for (let i = 0; i < ballCount; i++) {
      const c = playColors[i % playColors.length];
      const el = document.createElement("div");

      el.className = "sd-ball";
      el.style.width = sizePx + "px";
      el.style.height = sizePx + "px";
      el.style.background = c.code;
      el.dataset.colorName = c.name;

      // Startposition
      const x = r + Math.random() * Math.max(0, arenaW - 2 * r);
      const y = r + Math.random() * Math.max(0, arenaH - 2 * r);

      // Startgeschwindigkeit
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speedPxPerSec;
      const vy = Math.sin(angle) * speedPxPerSec;

      balls.push({ el, x, y, vx, vy });

      // initial render
      el.style.left = (x - r) + "px";
      el.style.top  = (y - r) + "px";

      arena.appendChild(el);
    }
  }

  function updatePhysics(dtMs) {
    const dt = dtMs / 1000;

    // 1) Bewegung + Wand-Bounce
    for (const b of balls) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Bounce links/rechts
      if (b.x - r < 0) { b.x = r; b.vx = Math.abs(b.vx); }
      else if (b.x + r > arenaW) { b.x = arenaW - r; b.vx = -Math.abs(b.vx); }

      // Bounce oben/unten
      if (b.y - r < 0) { b.y = r; b.vy = Math.abs(b.vy); }
      else if (b.y + r > arenaH) { b.y = arenaH - r; b.vy = -Math.abs(b.vy); }
    }

    // 2) Ball–Ball Kollisionen (einfach, schnell, reicht bei max 4 Bällen)
    const minDist = 2 * r;
    const minDistSq = minDist * minDist;

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > 0 && distSq < minDistSq) {
          const dist = Math.sqrt(distSq) || 0.001;
          const nx = dx / dist;
          const ny = dy / dist;

          // Überlappung auflösen (auseinander schieben)
          const overlap = (minDist - dist) / 2;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          // "Elastic" light: Geschwindigkeiten tauschen (für gleiche Masse ok)
          const tmpVx = a.vx, tmpVy = a.vy;
          a.vx = b.vx; a.vy = b.vy;
          b.vx = tmpVx; b.vy = tmpVy;

          // Nach dem Schieben nochmal sicherstellen, dass sie nicht aus der Arena rutschen
          a.x = Math.max(r, Math.min(arenaW - r, a.x));
          a.y = Math.max(r, Math.min(arenaH - r, a.y));
          b.x = Math.max(r, Math.min(arenaW - r, b.x));
          b.y = Math.max(r, Math.min(arenaH - r, b.y));
        }
      }
    }

    // 3) Render
    for (const b of balls) {
      b.el.style.left = (b.x - r) + "px";
      b.el.style.top  = (b.y - r) + "px";
    }
  }
  
  // --------------------------------------------------
  // TARGET
  // --------------------------------------------------
  function chooseTarget() {
    const idx = Math.floor(Math.random() * playColors.length);
    currentTarget = playColors[idx].name;

    if (hintEl) hintEl.textContent = `Klicke: ${currentTarget}`;
    speak(currentTarget);
    lastPromptTs = now();
  }

  // --------------------------------------------------
  // INPUT
  // --------------------------------------------------
  function onBallClick(e) {
    const chosen = e.currentTarget.dataset.colorName;
    const tNow = now();

    if (chosen === currentTarget) {
      const rt = tNow - lastPromptTs;
      if (rt > 0 && rt < 5000) rtSamples.push(rt);

      score++;
      chooseTarget();
    } else {
      misses++;
    }
    updateHUD(tNow);
  }

  function onArenaMiss(e) {
    if (balls.some(b => b.el === e.target)) return;
    misses++;
    updateHUD(now());
  }

  arena.addEventListener("click", onArenaMiss);

  // --------------------------------------------------
  // ABORT (INGAME BACK)
  // --------------------------------------------------
  function cleanupNoResult() {
    window.removeEventListener("resize", onResize);
    arena.removeEventListener("click", onArenaMiss);
    balls.forEach(b => b.el.removeEventListener("click", onBallClick));
  }

  function abortToMenu() {
    if (aborted) return;
    aborted = true;

    cleanupNoResult();

    try { window.speechSynthesis?.cancel?.(); } catch {}

    showScreen("menu");
  }

  backBtn?.addEventListener("click", abortToMenu);

  // --------------------------------------------------
  // FINISH (Timeout)
  // --------------------------------------------------
  function finish() {
    cleanupNoResult();

    const avgRtMs = rtSamples.length
      ? Math.round(rtSamples.reduce((a, b) => a + b, 0) / rtSamples.length)
      : 0;

    const total = score + misses;
    const accuracy = total > 0 ? score / total : 1;

    endGame({
      modeGroup: "audio",
      modeId: `audio-color-${cfg.label || "easy"}`,
      difficulty: cfg.label || null,

      score,
      hits: score,
      misses,
      avgRt: avgRtMs / 1000,
      accuracy,
      durationSec: totalMs / 1000,
      finishedAt: new Date().toISOString(),
    });

    setText("snd-res-diff", cfg.label || "–");
    setText("snd-res-score", String(score));
    setText("snd-res-avg", avgRtMs + " ms");
    setText("snd-res-misses", String(misses));
    setText("snd-res-endreason", "⏱️ Timeout");

    showScreen("sound-result");
  }

  // --------------------------------------------------
  // START
  // --------------------------------------------------
  startTs = now();
  endTs = startTs + totalMs;

  score = 0;
  misses = 0;

  createBalls();
  balls.forEach(b => b.el.addEventListener("click", onBallClick));
  chooseTarget();
  updateHUD(now());

  let lastFrameTs = now();

  function loop() {
    if (aborted) return;

    const tNow = now();
    if (tNow >= endTs) {
      finish();
      return;
    }

    const dt = tNow - lastFrameTs;
    lastFrameTs = tNow;

    updatePhysics(dt);
    updateHUD(tNow);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  window.lastSoundDifficulty = cfg.label || "easy";
}
