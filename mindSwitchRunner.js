// mindSwitchRunner.js
// Gemeinsamer Runner für Mind Switch (Easy/Medium/Hard) – nutzt den globalen Game-Over-Screen
import { endGame } from './core.js';
// NEU: für Musik & Stats-Refresh wie beim Grid-Back
import { ensureFrontMelody, startFrontMelody, refreshStatsUI } from './core.js';

export function startMindSwitch(cfg, label = 'MindSwitch') {
  // DOM refs
  const root    = document.getElementById('mind-switch');
  const left    = document.getElementById('ms-left');
  const right   = document.getElementById('ms-right');
  const prompt  = document.getElementById('ms-prompt');
  const uiScore = document.getElementById('ms-score');
  const uiTime  = document.getElementById('ms-time');
  const backBtn = document.getElementById('ms-back');

  if (!root || !left || !right || !prompt || !uiScore || !uiTime || !backBtn) {
    console.error('[MindSwitch] DOM unvollständig.');
    return;
  }

  // Sichtbarkeit
  showMindSwitch(true);
  hideGameOverScreen();

  // Defaults / Konfig
  const flashDelayMs      = cfg.flashDelayMs ?? 140;
  const noRepeat          = cfg.noImmediateRepeat ?? true;
  const chaosColor        = !!cfg.wordColorChaos;
  const cueMixed          = !!cfg.cueMixed;
  const listenWeight      = clamp01(cfg.listenWeight ?? 0.5);
  const conflictProb      = clamp01(cfg.conflictProbability ?? 0.5);
  const fixedColor        = cfg.fixedColor || null;

  // State
  let score = 0;
  let running = true;
  let lastIdx = -1;

  // Klick/RT-Stats
  let total = 0;
  let hits = 0;
  let misses = 0;
  let rtSum = 0;
  const rts = [];
  let promptTime = performance.now();
  let bestStreak = 0;
  let streak = 0;

  // aktuelle Runde
  let currentCue = cueMixed ? 'read' : null; // 'read' | 'listen' | null
  let visualText = null;
  let audioText  = null;
  let pendingSpeak = null;

  // Cue-Badge nur, wenn gemischt (Hard)
  let cueLabel = null;
  if (cueMixed) {
    cueLabel = document.getElementById('ms-cue');
    if (!cueLabel) {
      cueLabel = document.createElement('div');
      cueLabel.id = 'ms-cue';
      cueLabel.setAttribute('aria-live','polite');
      cueLabel.style.position = 'absolute';
      cueLabel.style.left = '50%';
      cueLabel.style.top = 'calc(50% - 80px)';
      cueLabel.style.transform = 'translateX(-50%)';
      cueLabel.style.fontWeight = '800';
      cueLabel.style.fontSize = 'clamp(22px, 4vw, 36px)';
      cueLabel.style.padding = '10px 18px';
      cueLabel.style.borderRadius = '999px';
      cueLabel.style.background = 'rgba(0,0,0,0.35)';
      cueLabel.style.backdropFilter = 'blur(2px)';
      cueLabel.style.color = '#fff';
      cueLabel.style.zIndex = '3';
      root.appendChild(cueLabel);
    }
  }

  // Zeit
  let t0 = performance.now();
  let deadline = t0 + cfg.totalTimeMs;

  // --- Auswahl & Logik ---
  const chooseIndex = () => {
    if (cfg.variants.length === 1) return 0;
    let idx;
    do {
      idx = (Math.random() * cfg.variants.length) | 0;
    } while (noRepeat && cfg.variants.length > 1 && idx === lastIdx);
    lastIdx = idx;
    return idx;
  };
  const pickText = () => cfg.variants[chooseIndex()];
  const pickCue  = () => (cueMixed ? (Math.random() < listenWeight ? 'listen' : 'read') : null);

  const computeCorrect = (txt) => {
    const isRot   = txt.includes('Rot');
    const isLinks = txt.includes('links');
    if (isRot && isLinks)  return 'right';
    if (isRot && !isLinks) return 'left';
    if (!isRot && isLinks) return 'left';
    return 'right';
  };

  const setCueLabel = (cue) => {
    if (!cueMixed || !cueLabel) return;
    currentCue = cue;
    cueLabel.textContent = cue === 'listen' ? 'Hören' : 'Lesen';
    cueLabel.style.background = cue === 'listen'
      ? 'linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35))'
      : 'linear-gradient(90deg, rgba(0,0,0,0.35), rgba(0,0,0,0.20))';
  };

  const setPrompt = (txt) => {
    visualText = txt;
    prompt.textContent = txt;

    if (fixedColor) {
      prompt.style.color = fixedColor;               // z. B. Weiß für Easy
    } else if (chaosColor) {
      prompt.style.color = Math.random() < 0.5 ? '#e53935' : '#2ecc71';
    } else {
      prompt.style.color = '#ffffff';
    }
    promptTime = performance.now(); // Zeitstempel für RT
  };

  // TTS (Deutsch)
  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices?.() || [];
      const de = voices.find(v => /de/i.test(v.lang)) || voices[0];
      if (de) u.voice = de;
      u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  // Flash
  const flash = (el, ok) => {
    el.classList.remove('ms-ok', 'ms-bad', 'ms-hit');
    void el.offsetWidth;
    el.classList.add(ok ? 'ms-ok' : 'ms-bad', 'ms-hit');
    setTimeout(() => {
      el.classList.remove('ms-ok', 'ms-bad', 'ms-hit');
    }, flashDelayMs);
  };

  const prepareRound = () => {
    const cue = pickCue(); // null bei Easy/Medium
    if (cue) setCueLabel(cue);

    if (cue === 'listen') {
      audioText = pickText();

      // Sichtbarer Text darf abweichen (Konflikt)
      if (Math.random() < conflictProb && cfg.variants.length > 1) {
        let t;
        do { t = pickText(); } while (t === audioText);
        setPrompt(t);
      } else {
        setPrompt(audioText);
      }

      try {
        speak(audioText);
      } catch {
        pendingSpeak = audioText;
      }
    } else {
      audioText = null;
      setPrompt(pickText());
    }
  };

  const nextPromptImmediate = () => {
    if (!running) return;
    prepareRound();
    bindClickHandlers();
  };

  const handleClick = (side) => {
    if (!running) return;

    if (pendingSpeak) { speak(pendingSpeak); pendingSpeak = null; }

    const decisiveText = (currentCue === 'listen' && audioText) ? audioText : visualText;
    const correct = computeCorrect(decisiveText);
    const el = side === 'left' ? left : right;
    const ok = side === correct;

    // Stats
    total++;
    if (ok) { hits++; streak++; bestStreak = Math.max(bestStreak, streak); }
    else    { misses++; streak = 0; }

    const rt = Math.max(0, performance.now() - promptTime);
    rts.push(rt); rtSum += rt;

    // Feedback + Score
    flash(el, ok);
    score = Math.max(0, score + (ok ? 1 : -(cfg.timeoutPenalty ?? 0)));
    uiScore.textContent = String(score);

    // kurze Flash-Pause, dann nächste (andere) Aufgabe
    setTimeout(() => {
      if (!running) return;
      nextPromptImmediate();
    }, flashDelayMs);
  };

  const bindClickHandlers = () => {
    left.onclick  = () => handleClick('left');
    right.onclick = () => handleClick('right');
  };

  const onKey = (e) => {
    if (!running) return;
    const k = e.key?.toLowerCase?.();
    if (k === 'arrowleft' || k === 'a')  left.click();
    if (k === 'arrowright'|| k === 'd')  right.click();
    if (k === 'escape') finish();
  };

  const cleanup = () => {
    running = false;
    left.onclick = right.onclick = null;
    backBtn.onclick = null;
    window.removeEventListener('keydown', onKey);
    if ('speechSynthesis' in window) try { window.speechSynthesis.cancel(); } catch {}
    showMindSwitch(false);
  };

  // >>> Grid-Back-ÄQUIVALENT (zurück zum Start wie beim Grid) <<<
  const goStartLikeGrid = () => {
    cleanup(); // MindSwitch-UI abbauen/aus
    // Screens schalten
    document.getElementById('game-over-screen')?.setAttribute('style', 'display:none; text-align:center;');
    document.getElementById('game-screen')?.setAttribute('style', 'display:none;');
    const ss = document.getElementById('start-screen');
    if (ss) ss.style.display = 'block';

    // Musik: erlauben & ggf. starten (wie in main.js)
    try { window.fdkAllowStartMusic?.(); } catch {}
    try {
      ensureFrontMelody?.();
      if (localStorage.getItem('musicOff') !== '1') startFrontMelody?.();
    } catch {}

    // Buttons unten links/rechts wieder zeigen (falls vorhanden)
    const statsBtn = document.getElementById('stats-toggle');
    if (statsBtn) statsBtn.style.display = 'block';
    const audioBtn = document.getElementById('start-audio-toggle');
    if (audioBtn) audioBtn.style.display = 'block';

    // Stats-UI (Jetzt/Bestwerte/Letzte 5)
    try { refreshStatsUI?.(); } catch {}
  };

  // Timer/Finish bleibt für reguläres Rundenende (Game Over → endGame + persist)
  const finish = () => {
    cleanup();

    // --- Kennzahlen berechnen für Stats & Game-Over ---
    const durationMs = Math.max(0, performance.now() - t0);
    const avgRtMs = rts.length ? rtSum / rts.length : 0;
    const acc = total ? hits / total : 0;
    const hpm = durationMs ? (hits / (durationMs / 60000)) : 0;

    // Game-Over-Screen füllen (wie deine anderen Modi)
    const player = (localStorage.getItem('lastPlayerName') || localStorage.getItem('playerName') || '').trim() || 'Player';
    const nameEl   = document.getElementById('player-name-final');
    const scoreEl  = document.getElementById('final-score');
    const rtEl     = document.getElementById('final-reaction');
    const accEl    = document.getElementById('final-accuracy');
    const missEl   = document.getElementById('final-misses');
    const streakEl = document.getElementById('final-best-streak');

    if (nameEl)  nameEl.textContent  = player;
    if (scoreEl) scoreEl.textContent = String(score);
    if (rtEl)    rtEl.textContent    = (avgRtMs/1000).toFixed(2) + ' s';
    if (accEl)   accEl.textContent   = Math.round(acc*100) + '%';
    if (missEl)  missEl.textContent  = String(misses);
    if (streakEl)streakEl.textContent= String(bestStreak);

    // Anzeigen
    const go = document.getElementById('game-over-screen');
    const ss = document.getElementById('start-screen');
    if (ss?.style) ss.style.display = 'none';
    if (go?.style) go.style.display = 'block';

    // --- An core.js melden (für "Jetzt", "Historie", Bestwerte) ---
    endGame?.({
      modeGroup: 'mind',
      modeId: cfg.modeId || label.toLowerCase(),   // z.B. "mind-easy"
      difficulty: cfg.difficulty || null,          // "easy" | "medium" | "hard"
      score,
      hits,
      misses,
      total,
      accuracy: total ? (hits/total) : 0,          // 0..1
      avgRt: (rts.length ? (rtSum / rts.length) : 0) / 1000, // Sekunden
      bestStreak,
      hpm: (performance.now() - t0) ? (hits / ((performance.now() - t0)/60000)) : 0,
      startedAt: new Date(performance.timeOrigin + t0).toISOString(),
      finishedAt: new Date().toISOString(),
      durationSec: Math.round(Math.max(0, performance.now() - t0)/1000)
    });
  };

  // WIE BEIM GRID: Zurück-Button geht direkt zum Start (nicht Game Over)
  backBtn.onclick = () => {
    // optional: Spiel als abgebrochen NICHT in die Historie schreiben
    goStartLikeGrid();
  };

  window.addEventListener('keydown', onKey);

  // Timer
  const tick = () => {
    if (!running) return;
    const now = performance.now();
    const leftMs = Math.max(0, deadline - now);
    uiTime.textContent = (leftMs / 1000).toFixed(1) + 's';
    if (leftMs <= 0) {
      finish();
      return;
    }
    requestAnimationFrame(tick);
  };

  // Start
  prepareRound();
  bindClickHandlers();
  tick();

  // ---------- Game Over Screen Integration (nicht genutzt für "Zurück") ----------
  function showGameOver(summary) {
    const player = (localStorage.getItem('lastPlayerName') || localStorage.getItem('playerName') || '').trim() || 'Player';

    const go = document.getElementById('game-over-screen');
    const nameEl   = document.getElementById('player-name-final');
    const scoreEl  = document.getElementById('final-score');
    const rtEl     = document.getElementById('final-reaction');
    const accEl    = document.getElementById('final-accuracy');
    const missEl   = document.getElementById('final-misses');
    const streakEl = document.getElementById('final-best-streak');

    if (nameEl)  nameEl.textContent  = player;
    if (scoreEl) scoreEl.textContent = String(summary.score ?? 0);
    if (rtEl)    rtEl.textContent    = (summary.avgRt ? (summary.avgRt/1000).toFixed(2) : '0') + ' s';
    const acc = summary.total ? Math.round((summary.hits/summary.total)*100) : 0;
    if (accEl)   accEl.textContent   = acc + '%';
    if (missEl)  missEl.textContent  = String(summary.misses ?? 0);
    if (streakEl)streakEl.textContent= String(summary.bestStreak ?? 0);

    document.getElementById('start-screen')?.style && (document.getElementById('start-screen').style.display = 'none');
    go.style.display = 'block';

    const restartBtn = document.getElementById('restart-button');
    const homeBtn    = document.getElementById('gameover-back-button');

    restartBtn?.replaceWith(restartBtn.cloneNode(true));
    homeBtn?.replaceWith(homeBtn.cloneNode(true));

    const newRestart = document.getElementById('restart-button');
    const newHome    = document.getElementById('gameover-back-button');

    newRestart?.addEventListener('click', () => {
      go.style.display = 'none';
      startMindSwitch(cfg, label);
    });

    newHome?.addEventListener('click', () => {
      go.style.display = 'none';
      document.getElementById('start-screen')?.style && (document.getElementById('start-screen').style.display = 'block');
      try { window.fdkAllowStartMusic?.(); ensureFrontMelody?.(); if (localStorage.getItem('musicOff') !== '1') startFrontMelody?.(); } catch {}
      try { refreshStatsUI?.(); } catch {}
      const statsBtn = document.getElementById('stats-toggle'); if (statsBtn) statsBtn.style.display = 'block';
      const audioBtn = document.getElementById('start-audio-toggle'); if (audioBtn) audioBtn.style.display = 'block';
    });
  }
}

// Utils
function showMindSwitch(show) {
  const sec = document.getElementById('mind-switch');
  if (!sec) return;
  sec.classList.toggle('hidden', !show);
}
function hideGameOverScreen() {
  const go = document.getElementById('game-over-screen');
  if (go) go.style.display = 'none';
}
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
