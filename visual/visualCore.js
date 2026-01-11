// visualCore.js – HTML-HUD Version (Master-HUD kompatibel)
import { showScreen } from "../screens.js";

const now = () => performance.now();

let teardownActive = null;

export function stopVisual() {
  if (typeof teardownActive === "function") teardownActive();
  teardownActive = null;
}

export function startVisual(cfg) {
  // Wichtig: alte Session sauber beenden (sonst doppelte Listener)
  stopVisual();

  const {
    totalMs = 30000,
    perStepMs = 1000,
    color = "#2ecc71",
    label = "Easy",
  } = cfg || {};

  showScreen("visual");

  const host = document.getElementById("screen-visual");
  if (!host) {
    console.error("[visual] #screen-visual fehlt");
    return;
  }

  // HTML-HUD / Arena aus index.html holen (nicht mehr bauen!)
  const scoreEl = document.getElementById("vs-score");
  const timeEl  = document.getElementById("vs-time");
  const arena   = document.getElementById("vs-arena");
  const backBtn = document.getElementById("vs-back");

  if (!arena) {
    console.error("[visual] #vs-arena fehlt im HTML (screen-visual)");
    return;
  }

  // =====================
  // STATE
  // =====================
  let running = true;
  let score = 0;
  let misses = 0;
  let circleSpawnT = 0;
  let circleDeadline = 0;
  const rts = [];
  const totalDeadline = now() + totalMs;

  // HUD init
  if (scoreEl) scoreEl.textContent = "0";
  if (timeEl) timeEl.textContent = String(Math.ceil(totalMs / 1000));

  // Arena leeren (nur Inhalt, nicht HUD!)
  arena.innerHTML = "";

  // Kreis anlegen
  const circle = document.createElement("div");
  circle.style.position = "absolute";
  circle.style.width = "50px";
  circle.style.height = "50px";
  circle.style.borderRadius = "50%";
  circle.style.background = color;
  circle.style.cursor = "pointer";
  arena.appendChild(circle);

  // =====================
  // HELPERS
  // =====================
  function updateHUD() {
    if (scoreEl) scoreEl.textContent = String(score);

    const remainMs = Math.max(0, totalDeadline - now());
    // du kannst hier auch mit 1 Nachkommastelle arbeiten – ich nehme ganze Sekunden, weil Master-HUD so wirkt
    if (timeEl) timeEl.textContent = String(Math.ceil(remainMs / 1000));
  }

  function moveCircleAndResetWindow() {
    const rect = arena.getBoundingClientRect();
    const size = 50;
    const pad = 10;

    const maxX = Math.max(pad, rect.width - size - pad);
    const maxY = Math.max(pad, rect.height - size - pad);

    const x = pad + Math.random() * (maxX - pad);
    const y = pad + Math.random() * (maxY - pad);

    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;

    circleSpawnT = now();
    circleDeadline = circleSpawnT + perStepMs;
  }

  function cleanup() {
    running = false;
  }

  function finish(reason = "Zeit abgelaufen") {
    cleanup();

    const avg =
      rts.length > 0 ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;

    const res = document.getElementById("screen-visual-result");
    if (res) {
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      set("vs-res-diff", String(label));
      set("vs-res-steps", String(score));
      set("vs-res-avg", `${avg} ms`);
      set("vs-res-misses", String(misses));
      set("vs-res-endreason", String(reason));

      showScreen("visual-result");
      return;
    }

    showScreen("menu");
  }

  // =====================
  // EVENTS
  // =====================
  const downEvt = "onpointerdown" in window ? "pointerdown" : "mousedown";

  const onArenaDown = (e) => {
    if (!running) return;
    if (e.target === circle) return;
    // Fehlklick in Arena
    misses++;
    moveCircleAndResetWindow();
  };

  const onCircleDown = (e) => {
    if (!running) return;
    e.preventDefault?.();

    const rt = now() - circleSpawnT;
    rts.push(rt);

    score++;
    moveCircleAndResetWindow();
  };

  arena.addEventListener(downEvt, onArenaDown);
  circle.addEventListener(downEvt, onCircleDown);

  const onBack = () => {
    stopVisual();
    showScreen("menu");
  };
  backBtn && (backBtn.onclick = onBack);

  // =====================
  // LOOP
  // =====================
  let rafId = 0;

  function loop() {
    if (!running) return;

    // Gesamtzeit vorbei?
    if (now() >= totalDeadline) {
      finish("Zeit abgelaufen");
      return;
    }

    // Kreis nicht rechtzeitig geklickt = Miss
    if (now() > circleDeadline) {
      misses++;
      moveCircleAndResetWindow();
    }

    updateHUD();
    rafId = requestAnimationFrame(loop);
  }

  // START
  moveCircleAndResetWindow();
  rafId = requestAnimationFrame(loop);

  // =====================
  // TEARDOWN speichern (für Restart)
  // =====================
  teardownActive = () => {
    running = false;
    try { cancelAnimationFrame(rafId); } catch {}
    try { arena.removeEventListener(downEvt, onArenaDown); } catch {}
    try { circle.removeEventListener(downEvt, onCircleDown); } catch {}
    try { if (circle.parentNode) circle.parentNode.removeChild(circle); } catch {}
    try { if (backBtn) backBtn.onclick = null; } catch {}
  };
}
