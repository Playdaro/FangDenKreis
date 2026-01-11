// soundCore.js – Master HUD + Master Playfield
import { showScreen } from "../screens.js";

const $ = (s, r = document) => r.querySelector(s);
const now = () => performance.now();

// Farb-Mapping
const COLOR_MAP = {
  rot:  { name: "Rot",  code: "#e74c3c" },
  grün: { name: "Grün", code: "#2ecc71" },
  gelb: { name: "Gelb", code: "#f1c40f" },
  blau: { name: "Blau", code: "#3498db" },
};

// einfache Sprach-Ausgabe
function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "de-DE";
    msg.rate = 2.0;
    window.speechSynthesis.speak(msg);
  } catch {}
}

function getBaseSpeed(cfg) {
  switch (cfg.label) {
    case "hard": return 260;
    case "medium": return 220;
    case "easy":
    default: return 180;
  }
}

function pickBallSizePx() {
  return window.matchMedia("(max-width: 768px)").matches ? 52 : 40;
}

// Miss-Flash
function triggerMissFlash() {
  const host = document.getElementById("screen-sound");
  if (!host) return;
  host.classList.remove("flash-miss");
  void host.offsetWidth; // Reflow
  host.classList.add("flash-miss");
  setTimeout(() => host.classList.remove("flash-miss"), 180);
}

// ----------- Haupt-API -------------
export function startSoundColor(cfg) {
  showScreen("sound");

  const host = document.getElementById("screen-sound");
  if (!host) throw new Error("#screen-sound fehlt");

  const arena = document.getElementById("sd-arena");
  const backBtn = document.getElementById("sd-back");

  const scoreEl = document.getElementById("sd-score");
  const missEl  = document.getElementById("sd-misses");
  const timeEl  = document.getElementById("sd-time");
  const hintEl  = document.getElementById("sd-hint");

  if (!arena) throw new Error("#sd-arena fehlt im HTML");
  if (!scoreEl || !timeEl) console.warn("[sound] HUD-Elemente fehlen (sd-score/sd-time)");
  if (!missEl) console.warn("[sound] HUD-Element fehlt: sd-misses");
  if (!hintEl) console.warn("[sound] Hint fehlt: sd-hint");

  // Arena leeren (nur Bälle, Hint bleibt)
  arena.querySelectorAll(".sd-ball").forEach(n => n.remove());

  // --- State ---
  const totalMs   = cfg.totalMs || 30000;
  const baseSpeed = cfg.speedPxPerSec || getBaseSpeed(cfg);
  const ballCount = Math.max(1, Math.min(4, cfg.count || 2));

  const playColors = (cfg.colors || ["rot", "grün"]).map(c =>
    COLOR_MAP[(c || "").toLowerCase()] || COLOR_MAP.rot
  );

  const balls = [];
  const rts   = [];
  let score   = 0;
  let misses  = 0;
  let startTs = now();
  let endTs   = startTs + totalMs;
  let lastPromptTs = startTs;
  let currentTarget = null;

  const sizePx = pickBallSizePx();
  const r      = sizePx / 2;

  // Arena-Größe
  function getSize() {
    const rect = arena.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }
  let { w: arenaW, h: arenaH } = getSize();

  function onResize() {
    const s = getSize();
    arenaW = s.w;
    arenaH = s.h;
  }
  window.addEventListener("resize", onResize);

  function updateHUD(tNow) {
    const remain = Math.max(0, endTs - tNow);

    if (timeEl) timeEl.textContent = String(Math.ceil(remain / 1000));
    if (scoreEl) scoreEl.textContent = String(score);
    if (missEl) missEl.textContent = String(misses);
  }

  // Bälle erzeugen
  function createBalls() {
    balls.length = 0;
    arena.querySelectorAll(".sd-ball").forEach(n => n.remove());

    for (let i = 0; i < ballCount; i++) {
      const c = playColors[i % playColors.length];
      const el = document.createElement("div");

      el.className = "sd-ball";
      el.style.width  = sizePx + "px";
      el.style.height = sizePx + "px";
      el.style.background = c.code;
      el.dataset.colorName = c.name;

      const x = r + Math.random() * (arenaW - 2 * r);
      const y = r + Math.random() * (arenaH - 2 * r);

      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * baseSpeed;
      const vy = Math.sin(angle) * baseSpeed;

      balls.push({ el, x, y, vx, vy, r });
      arena.appendChild(el);
    }
  }

  // Neues Ziel wählen + ansagen + Hint setzen
  function chooseNewTarget() {
    const idx = Math.floor(Math.random() * playColors.length);
    const target = playColors[idx];
    currentTarget = target.name;

    if (hintEl) hintEl.textContent = `Klicke: ${target.name}`;
    speak(target.name);
    lastPromptTs = now();
  }

  function resetBallsAndPrompt() {
    const s = getSize();
    arenaW = s.w;
    arenaH = s.h;

    for (const b of balls) {
      b.x = r + Math.random() * (arenaW - 2 * r);
      b.y = r + Math.random() * (arenaH - 2 * r);
      const angle = Math.random() * Math.PI * 2;
      b.vx = Math.cos(angle) * baseSpeed;
      b.vy = Math.sin(angle) * baseSpeed;
    }

    chooseNewTarget();
  }

  // Physik: Wände + Ball-Ball-Kollision
  function updatePhysics(dtMs) {
    const dtSec = dtMs / 1000;

    for (const b of balls) {
      b.x += b.vx * dtSec;
      b.y += b.vy * dtSec;

      if (b.x - r < 0) { b.x = r; b.vx = Math.abs(b.vx); }
      else if (b.x + r > arenaW) { b.x = arenaW - r; b.vx = -Math.abs(b.vx); }

      if (b.y - r < 0) { b.y = r; b.vy = Math.abs(b.vy); }
      else if (b.y + r > arenaH) { b.y = arenaH - r; b.vy = -Math.abs(b.vy); }
    }

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.r + b.r;

        if (distSq > 0 && distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;

          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          const tmpVx = a.vx;
          const tmpVy = a.vy;
          a.vx = b.vx; a.vy = b.vy;
          b.vx = tmpVx; b.vy = tmpVy;
        }
      }
    }

    for (const b of balls) {
      b.el.style.left = (b.x - r) + "px";
      b.el.style.top  = (b.y - r) + "px";
    }
  }

  function handleBallClick(e) {
    e.preventDefault?.();
    const el = e.currentTarget;
    const chosen = el.dataset.colorName;
    if (!chosen) return;

    const tNow = now();
    if (chosen === currentTarget) {
      const rt = Math.max(0, tNow - lastPromptTs);
      rts.push(rt);
      score++;
      resetBallsAndPrompt();
    } else {
      misses++;
      triggerMissFlash();
    }
  }

  function handleArenaClick(e) {
    if (balls.some(b => b.el === e.target)) return;
    misses++;
    triggerMissFlash();
  }

  arena.addEventListener("click", handleArenaClick);

  function finish() {
    window.removeEventListener("resize", onResize);
    arena.removeEventListener("click", handleArenaClick);
    balls.forEach(b => b.el.removeEventListener("click", handleBallClick));

    const scrRes = document.getElementById("screen-sound-result");
    if (!scrRes) { showScreen("menu"); return; }

    const avg = rts.length
      ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length)
      : 0;

    const diffEl   = scrRes.querySelector("#snd-res-diff");
    const scoreOut = scrRes.querySelector("#snd-res-score");
    const avgOut   = scrRes.querySelector("#snd-res-avg");
    const missOut  = scrRes.querySelector("#snd-res-misses");
    const endOut   = scrRes.querySelector("#snd-res-endreason");

    if (diffEl)   diffEl.textContent   = cfg.label || "–";
    if (scoreOut) scoreOut.textContent = String(score);
    if (avgOut)   avgOut.textContent   = avg + " ms";
    if (missOut)  missOut.textContent  = String(misses);
    if (endOut)   endOut.textContent   = "⏱️ Timeout";

    showScreen("sound-result");

    try {
      const total = score + misses;
      const runArg = {
        modeGroup:   "audio",
        modeId:      "audio-color",
        difficulty:  cfg.label || null,
        score,
        hits:        score,
        misses,
        total,
        avgRt:       avg / 1000,
        accuracy:    total > 0 ? score / total : 1,
        hpm:         totalMs > 0 ? (score / (totalMs / 60000)) : 0,
        bestStreak:  0,
        durationSec: totalMs / 1000,
        finishedAt:  new Date().toISOString()
      };
      window.endGame?.(runArg);
    } catch (e) {
      console.warn("[soundCore] endGame-Statistikfehler", e);
    }
  }

  $("#sd-back")?.addEventListener("click", () => {
    window.removeEventListener("resize", onResize);
    arena.removeEventListener("click", handleArenaClick);
    balls.forEach(b => b.el.removeEventListener("click", handleBallClick));
    showScreen("menu");
  }, { once: true });

  // Initial
  startTs = now();
  endTs = startTs + totalMs;

  score = 0;
  misses = 0;
  updateHUD(now());

  createBalls();
  balls.forEach(b => b.el.addEventListener("click", handleBallClick));
  resetBallsAndPrompt();

  let lastFrameTs = now();

  function loop() {
    const tNow = now();
    if (tNow >= endTs) { finish(); return; }

    const dt = tNow - lastFrameTs;
    lastFrameTs = tNow;

    updatePhysics(dt);
    updateHUD(tNow);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
