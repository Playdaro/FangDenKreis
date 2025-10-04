// main.js – Refactor + Best-Streak-Anzeige + Modal-Logik + Dekor-Bouncing + Startscreen-Audio + Reduced-Motion / Performance-Fallback + Trainings-Intro
// === Fremd-Fehler (Extensions) aus der Konsole filtern – optional ===
window.addEventListener('error', (e) => {
  const s = (e?.error?.stack || e?.message || '') + '';
  if (s.includes('chrome-extension://')) {
    e.preventDefault(); // rote Fehlermeldung unterdrücken
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  const s = (e?.reason?.stack || e?.reason || '') + '';
  if (s.includes('chrome-extension://')) {
    e.preventDefault();
  }
}, true);



import { initCore, updateBestStreakDisplay, reactionTimes,  playerName } from './core.js';
import { beginSession, finalizeRunAndPersist, loadRuns, loadBests, loadPlaytime } from './stats.js';

// NEU - Reset Fuktion
import { resetGameState } from './reset.js';

import { startEasyMode }   from './easy.js';
import { startMediumMode } from './medium.js';
import { startHardMode }   from './hard.js';
import { startTraining }   from './training.js';
import { updateHighscoreUI } from './highscore.js';
import { startEasyAudioColorMode }   from './easyaudioColor.js';
import { startMediumAudioColorMode } from './mediumAudioColor.js';
import { startHardAudioColorMode }   from './hardAudioColor.js';
import { startTrainingTimedColor }   from './trainingTimedColor.js';

// NEU – getrennte Grid-Module (statt altem gridMode.js)
import { startGridEasy,   stopGridEasy }   from './gridEasy.js';
import { startGridMedium, stopGridMedium } from './gridMedium.js';
import { startGridHard,   stopGridHard }   from './gridHard.js';
import { startGridTimingEasy }   from './gridTimingEasy.js';
import { startGridTimingMedium } from './gridTimingMedium.js';
import { startGridTimingHard }   from './gridTimingHard.js';


import { startSimon } from './simonBase.js';
// NEUE Imports für Simon-Says Varianten
import { startSimonEasy }   from './simonEasy.js';
import { startSimonMedium } from './simonMedium.js';
import { startSimonHard }   from './simonHard.js';

// NEU - Shape Shift
import { startShapeShiftEasy } from './shapeShiftEasy.js';
import { startShapeShiftMedium } from './shapeShiftMedium.js';
import { startShapeShiftHard } from './shapeShiftHard.js';


// === Merker für "Weiter spielen" ===
let lastModeType = null;        // 'grid' | null (kannst du später für andere Modi erweitern)
let lastGridDifficulty = null;  // 'easy' | 'medium' | 'hard'

// === Feature flags / environment checks ===
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowConcurrency = (() => {
  const hc = navigator.hardwareConcurrency || 4;
  const dm = navigator.deviceMemory || 4; // in GB, fallback if undefined
  return hc <= 2 || (dm && dm <= 2);
})();

/* =======================
   MUSIK-GUARD (GLOBAL)
   ======================= */
// Blockiert Startscreen-Musik während des Spielens:
window.__fdkBlockStartMusic = window.__fdkBlockStartMusic ?? false;
window.fdkBlockStartMusic   = () => { window.__fdkBlockStartMusic = true;  };
window.fdkAllowStartMusic   = () => { window.__fdkBlockStartMusic = false; };

/* =======================
   Audio-Toggle Sichtbarkeit
   ======================= */
function setAudioToggleVisible(show) {
  const btn = document.getElementById('start-audio-toggle');
  if (btn) btn.style.display = show ? 'block' : 'none';
}

/* =======================
   Stats-Button unten links
   ======================= */
function setStatsToggleVisible(show) {
  const btn = document.getElementById('stats-toggle');
  if (btn) btn.style.display = show ? 'block' : 'none';
}
function initStatsButton() {
  if (document.getElementById('stats-toggle')) return;

  const btn = document.createElement('button');
  btn.id = 'stats-toggle';
  btn.textContent = '📊';
  btn.setAttribute('aria-label', 'Statistiken');
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '10px',
    left: '10px',
    padding: '6px 10px',
    fontSize: '14px',
    zIndex: '999',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
  });

  btn.addEventListener('click', openStatsModal);
  document.body.appendChild(btn);
  setStatsToggleVisible(false);
}

/* =======================
   Stats-Modal Logik
   ======================= */
function fmtSec(s) {
  s = Math.max(0, Math.round(+s || 0));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
  return `${h}h ${m}m`;
}
function fmtPct(x) { return `${Math.round((+x || 0)*100)}%`; }
function fmtRt(x)  { const v = +x || 0; return `${v.toFixed(2)} s`; }
function safeText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

function renderStatsModal() {
  const runsWrap = loadRuns();
  const runs = (runsWrap?.runs || []).slice();
  const bests = loadBests();
  const play  = loadPlaytime();

  // Letzter Run (falls vorhanden)
  const last = runs.length ? runs[runs.length - 1] : null;
  if (last) {
    safeText('s-last-mode', last.modeId || last.modeGroup || '–');
    safeText('s-score', String(last.score || 0));
    safeText('s-acc', fmtPct(last.accuracy || 0));
    safeText('s-avg', fmtRt(last.avgRt || 0));
    safeText('s-med', fmtRt(last.medRt || 0));
    safeText('s-beststreak', String(last.bestStreak || 0));
    safeText('s-hpm', (last.hpm || 0).toFixed(1));
    safeText('s-duration', fmtSec(last.durationSec || 0));
  } else {
    ['s-last-mode','s-score','s-acc','s-avg','s-med','s-beststreak','s-hpm','s-duration']
      .forEach(id => safeText(id, '–'));
  }

  // Spielzeit: heute, 7 Tage, gesamt
  const todayKey = (new Date()).toISOString().slice(0,10); // YYYY-MM-DD
  const todaySec = play?.byDay?.[todayKey]?.seconds || 0;

  let sevenDays = 0;
  let totalSec  = 0;
  if (play?.byDay) {
    const keys = Object.keys(play.byDay).sort(); // chronologisch
    totalSec = keys.reduce((sum, k) => sum + (play.byDay[k]?.seconds || 0), 0);
    const last7 = keys.slice(-7);
    sevenDays = last7.reduce((sum, k) => sum + (play.byDay[k]?.seconds || 0), 0);
  }
  safeText('s-today', fmtSec(todaySec));
  safeText('s-7d',    fmtSec(sevenDays));
  safeText('s-total', fmtSec(totalSec)); // <- NEU

  // Bestwerte (global)
  const g = bests?.global || {};
  safeText('b-bestscore', String(g.bestScore ?? 0));
  safeText('b-longest',   fmtSec(g.longestSessionSec || 0));
  safeText('b-avg',       g.bestAvgRt != null ? fmtRt(g.bestAvgRt) : '–');
  safeText('b-acc',       g.bestAccuracy != null ? fmtPct(g.bestAccuracy) : '–');
  safeText('b-hpm',       g.bestHpm != null ? (g.bestHpm.toFixed(1)) : '–');
  safeText('b-streak',    String(play?.dayStreak || 0));

  // Letzte 5 Runden
  const tbody = document.querySelector('#runs-table tbody');
  if (tbody) {
    tbody.innerHTML = '';
    runs.slice(-5).reverse().forEach(run => {
      const tr = document.createElement('tr');
      const dt = new Date(run.tsEnd || Date.now());
      const dstr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      tr.innerHTML = `
        <td>${dstr}</td>
        <td>${run.modeId || run.modeGroup || '–'}</td>
        <td>${run.score ?? 0}</td>
        <td>${fmtRt(run.avgRt || 0)}</td>
        <td>${fmtPct(run.accuracy || 0)}</td>
        <td>${fmtSec(run.durationSec || 0)}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}


function openStatsModal() {
  const m = document.getElementById('stats-modal');
  if (!m) return;
  renderStatsModal();
  m.style.display = 'flex';
}
function closeStatsModal() {
  const m = document.getElementById('stats-modal');
  if (m) m.style.display = 'none';
}
function initStatsModalWiring() {
  const m = document.getElementById('stats-modal');
  if (!m) return;

  const closeBtn = m.querySelector('.modal-close');
  closeBtn?.addEventListener('click', closeStatsModal);
  m.addEventListener('click', (e) => { if (e.target === m) closeStatsModal(); });

  const tabBtns = m.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      m.querySelector('#stats-tab-now').style.display = (tab === 'now') ? 'block' : 'none';
      m.querySelector('#stats-tab-history').style.display = (tab === 'history') ? 'block' : 'none';
    });
  });
}

/* =======================
   Stats: Persist-Guard (De-Dupe)
   ======================= */
const __persistGuard = { key: '', ts: 0 };
function persistOnce(payload) {
  // Name auffüllen
  payload.playerName = payload.playerName || (playerName || localStorage.getItem('lastPlayerName') || '');

  // Dauer vereinheitlichen
  if (payload.duration == null && payload.durationSec != null) {
    payload.duration = payload.durationSec;
  }

  // „Looser“ Signatur: ignoriert modeGroup/modeId → fängt doppelte Events ab
  const sig = [
    payload.score ?? 0,
    payload.misses ?? 0,
    payload.bestStreak ?? 0,
    payload.duration ?? 0
  ].join('|');

  const now = Date.now();
  if (__persistGuard.key === sig && (now - __persistGuard.ts) < 1500) {
    return; // Duplikat innerhalb 1.5s ignorieren
  }
  __persistGuard.key = sig;
  __persistGuard.ts  = now;

  // Tatsächlich speichern
  finalizeRunAndPersist(payload);
}

// === Startscreen-Audio ===
let startScreenAudio = null;
let startScreenAudioEnabled = false;
let startScreenAudioFadeInterval = null;

function initStartscreenAudio() {
  if (startScreenAudio) return;
  startScreenAudio = new Audio('Frontmelodie.wav'); // Datei im gleichen Verzeichnis
  startScreenAudio.loop = true;
  startScreenAudio.preload = 'auto';
  startScreenAudio.volume = 0;
  startScreenAudio.muted = false;

  // Mute/Unmute-Button nur auf Startscreen
  const muteBtn = document.createElement('button');
  muteBtn.id = 'start-audio-toggle';
  muteBtn.textContent = '🔈';
  muteBtn.setAttribute('aria-label', 'Sound an/aus');
  Object.assign(muteBtn.style, {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    padding: '6px 10px',
    fontSize: '14px',
    zIndex: '999',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
  });
  document.body.appendChild(muteBtn);

  // Initial: Button ausblenden (nur Startscreen zeigt ihn)
  muteBtn.style.display = 'none';

  let muted = false;
  const updateButton = () => {
    muteBtn.textContent = muted ? '🔇' : '🔈';
  };
  updateButton();

  muteBtn.addEventListener('click', () => {
    if (!startScreenAudio) return;
    muted = !muted;
    startScreenAudio.muted = muted;
    if (muted) {
      clearInterval(startScreenAudioFadeInterval);
      startScreenAudio.volume = 0;
    } else {
      fadeInStartscreenAudio(0.15, 500);
    }
    updateButton();
  });

  // global verfügbar machen (für Spiel-Module)
  window.stopStartscreenMusic = stopStartscreenMusic;
}

function fadeInStartscreenAudio(targetVol = 0.15, durationMs = 500) {
  if (!startScreenAudio) return;
  clearInterval(startScreenAudioFadeInterval);
  const steps = 20;
  const stepTime = durationMs / steps;
  let currentStep = 0;
  startScreenAudio.volume = 0;
  startScreenAudioFadeInterval = setInterval(() => {
    currentStep++;
    startScreenAudio.volume = Math.min(targetVol, (targetVol / steps) * currentStep);
    if (currentStep >= steps) {
      clearInterval(startScreenAudioFadeInterval);
    }
  }, stepTime);
}

// Musik nur bei Interaktion starten – aber **NICHT**, wenn geblockt
function enableStartscreenMusicOnce() {
  if (window.__fdkBlockStartMusic) return; // GUARD: im Spiel keine Musik starten
  if (startScreenAudioEnabled) return;
  if (!startScreenAudio) return;
  startScreenAudio.play().catch(() => {
    // Autoplay kann blockiert sein bis Interaktion – wird durch waitForInteractionToStartAudio gedeckt
  });
  fadeInStartscreenAudio(0.15, 800);
  startScreenAudioEnabled = true;
}

function stopStartscreenMusic() {
  if (!startScreenAudio) return;
  startScreenAudio.pause();
  startScreenAudio.currentTime = 0;
  startScreenAudioEnabled = false;
  clearInterval(startScreenAudioFadeInterval);
}

// Audio-Interaktion-Trigger
function waitForInteractionToStartAudio() {
  const handler = () => {
    enableStartscreenMusicOnce();
    document.removeEventListener('click', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('click', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
}

function showAudioPrompt() {
  const hint = document.createElement('div');
  hint.textContent = 'Klicke irgendwo, um Hintergrundmusik zu aktivieren';
  Object.assign(hint.style, {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    zIndex: '1000',
    pointerEvents: 'none',
  });
  document.body.appendChild(hint);
  setTimeout(() => {
    hint.remove();
  }, 5000);
}

// Startscreen anzeigen / Musik vorbereiten
function showStartScreen() {
  ['info-screen', 'name-screen', 'game-screen', 'game-over-screen', 'training-end-screen'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const start = document.getElementById('start-screen');
  if (start) start.style.display = 'block';

  updateHighscoreUI();
  updateBestStreakDisplay();

  // Beim Startscreen darf Musik wieder starten
  window.fdkAllowStartMusic?.();

  showAudioPrompt();
  waitForInteractionToStartAudio();

  // Buttons nur auf Startscreen sichtbar
  setAudioToggleVisible(true);
  setStatsToggleVisible(true);
}

window.addEventListener('DOMContentLoaded', () => {
  // Core initialisieren
  initCore();

  initStatsButton();
  initStatsModalWiring();

  // Audio + Stats-Button vorbereiten
  initStartscreenAudio();

  // Standard: außerhalb Startscreen erstmal verstecken
  setAudioToggleVisible(false);
  setStatsToggleVisible(false);

  // === VISUELL (Speed-Modi) – beginSession vor dem Start (1a)
  document.getElementById('btn-easy')  ?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    beginSession({ modeGroup:'visual', modeId:'visual-easy', difficulty:'easy' });
    startEasyMode(); 
  });
  document.getElementById('btn-medium')?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    beginSession({ modeGroup:'visual', modeId:'visual-medium', difficulty:'medium' });
    startMediumMode(); 
  });
  document.getElementById('btn-hard')  ?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    beginSession({ modeGroup:'visual', modeId:'visual-hard', difficulty:'hard' });
    startHardMode(); 
  });
    // --- Shape Shift Modal ---
  const btnShape     = document.getElementById('btn-shape');
  const shapeModal   = document.getElementById('shape-modal');
  const shapeClose   = shapeModal?.querySelector('.modal-close');
  const btnShapeEasy   = document.getElementById('btn-shape-easy');
  const btnShapeMedium = document.getElementById('btn-shape-medium');
  const btnShapeHard   = document.getElementById('btn-shape-hard');

  if (btnShape && shapeModal && shapeClose) {
    btnShape.addEventListener('click', () => { shapeModal.style.display = 'flex'; });
    shapeClose.addEventListener('click', () => { shapeModal.style.display = 'none'; });
    shapeModal.addEventListener('click', e => { if (e.target === shapeModal) shapeModal.style.display = 'none'; });
  }

btnShapeEasy?.addEventListener('click', () => {
  shapeModal.style.display = 'none';
  stopStartscreenMusic(); window.fdkBlockStartMusic?.();
  setAudioToggleVisible(false); setStatsToggleVisible(false);
  beginSession({ modeGroup: 'visual', modeId: 'shape-easy', difficulty: 'easy' });

  // >>> Hard-Switch: Startscreen aus, Game-Screen an
  const ss = document.getElementById('start-screen');
  const gs = document.getElementById('game-screen');
  if (ss && gs) { ss.style.display = 'none'; gs.style.display = 'block'; }

  startShapeShiftEasy();
});

btnShapeMedium?.addEventListener('click', () => {
  shapeModal.style.display = 'none';
  stopStartscreenMusic(); window.fdkBlockStartMusic?.();
  setAudioToggleVisible(false); setStatsToggleVisible(false);
  beginSession({ modeGroup: 'visual', modeId: 'shape-medium', difficulty: 'medium' });

  const ss = document.getElementById('start-screen');
  const gs = document.getElementById('game-screen');
  if (ss && gs) { ss.style.display = 'none'; gs.style.display = 'block'; }

  startShapeShiftMedium();
});

btnShapeHard?.addEventListener('click', () => {
  shapeModal.style.display = 'none';
  stopStartscreenMusic(); window.fdkBlockStartMusic?.();
  setAudioToggleVisible(false); setStatsToggleVisible(false);
  beginSession({ modeGroup: 'visual', modeId: 'shape-hard', difficulty: 'hard' });

  const ss = document.getElementById('start-screen');
  const gs = document.getElementById('game-screen');
  if (ss && gs) { ss.style.display = 'none'; gs.style.display = 'block'; }

  startShapeShiftHard();
});




  // Trainingsmodus mit Intro-Modal (ersetzt direkte startTraining-Aufruf)
  const trainingBtn = document.getElementById('btn-training');
  const trainingIntroModal = document.getElementById('training-info-modal');
  const trainingConfirmBtn = document.getElementById('start-training-confirm');
  const skipCheckbox = document.getElementById('skip-training-intro');
  const trainingCloseBtn = trainingIntroModal?.querySelector('.modal-close');

  if (trainingBtn) {
    trainingBtn.addEventListener('click', () => {
      if (localStorage.getItem('seenTrainingIntro') === 'true') {
        stopStartscreenMusic();
        window.fdkBlockStartMusic?.();
        setAudioToggleVisible(false); setStatsToggleVisible(false);
        startTraining();
        return;
      }
      if (trainingIntroModal) trainingIntroModal.style.display = 'flex';
    });
  }

  // Bestätigen im Intro
  if (trainingConfirmBtn) {
    trainingConfirmBtn.addEventListener('click', () => {
      if (skipCheckbox?.checked) {
        localStorage.setItem('seenTrainingIntro', 'true');
      }
      if (trainingIntroModal) trainingIntroModal.style.display = 'none';
      stopStartscreenMusic();
      window.fdkBlockStartMusic?.();
      setAudioToggleVisible(false); setStatsToggleVisible(false);
      startTraining();
    });
  }

  // Intro schließen (X)
  if (trainingCloseBtn) {
    trainingCloseBtn.addEventListener('click', () => {
      if (trainingIntroModal) trainingIntroModal.style.display = 'none';
    });
  }

  // Klick außerhalb schließt Intro
  if (trainingIntroModal) {
    trainingIntroModal.addEventListener('click', e => {
      if (e.target === trainingIntroModal) {
        trainingIntroModal.style.display = 'none';
      }
    });
  }

  // === AUDIO (Hör-Reaktion) – beginSession vor dem Start (1a)
  document.getElementById('btn-easyaudio')?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    beginSession({ modeGroup:'audio', modeId:'audio-easy', difficulty:'easy' });
    startEasyAudioColorMode(); 
  });
  document.getElementById('btn-mediaudio')?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    beginSession({ modeGroup:'audio', modeId:'audio-medium', difficulty:'medium' });
    startMediumAudioColorMode(); 
  });
  document.getElementById('btn-hardaudio')?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    beginSession({ modeGroup:'audio', modeId:'audio-hard', difficulty:'hard' });
    startHardAudioColorMode(); 
  });
  document.getElementById('btn-timedtrain')?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    startTrainingTimedColor(); 
  });

  // Info → Name Screen
  const infoContinue = document.getElementById('info-continue');
  if (infoContinue) {
    infoContinue.addEventListener('click', () => {
      document.getElementById('info-screen').style.display  = 'none';
      document.getElementById('name-screen').style.display  = 'block';
      localStorage.setItem('instructionsSeen', 'true');
    });
  }

  // Name Submit
  const nameSubmit = document.getElementById('name-submit');
  const nameInput  = document.getElementById('name-input');
  if (nameSubmit && nameInput) {
    nameSubmit.addEventListener('click', () => {
      const raw = (nameInput.value || '').trim();
      if (!raw) { alert('Bitte gib einen Namen ein.'); return; }
      if (raw.length > 12) { alert('Max. 12 Zeichen.'); return; }
      if (/\s/.test(raw)) { alert('Keine Leerzeichen.'); return; }
      if (/\d{4,}/.test(raw)) { alert('Bitte keinen echten Namen.'); return; }

      localStorage.setItem('lastPlayerName', raw);
      showStartScreen();
    });
  }

  // Wiederkehrender Spieler
  const existingName = localStorage.getItem('lastPlayerName');
  if (existingName) {
    showStartScreen();
  } else {
    const instructionsSeen = localStorage.getItem('instructionsSeen');
    if (instructionsSeen) {
      document.getElementById('name-screen').style.display = 'block';
    } else {
      document.getElementById('info-screen').style.display = 'block';
    }
  }

  // Rückkehr zum Startscreen
  const backBtn = document.getElementById('back-button');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Alle Grid-Varianten sicher stoppen (harmlos, wenn nicht aktiv)
      stopGridEasy();
      stopGridMedium();
      stopGridHard();

      // Beim Startscreen wieder erlauben und Buttons zeigen
      window.fdkAllowStartMusic?.();
      showStartScreen();
    });
  }
  const gameoverBack = document.getElementById('gameover-back-button');
  if (gameoverBack) {
    gameoverBack.addEventListener('click', () => {
      window.fdkAllowStartMusic?.();
      showStartScreen();
    });
  }

  
  // Highscore & Streak
  updateHighscoreUI();
  updateBestStreakDisplay();

  // Visuelle Modal-Logik
  const btnVisual   = document.getElementById('btn-visual');
  const visualModal = document.getElementById('visual-modal');
  const visualClose = visualModal?.querySelector('.modal-close');
  if (btnVisual && visualModal && visualClose) {
    btnVisual.addEventListener('click', () => { visualModal.style.display = 'flex'; });
    visualClose.addEventListener('click', () => { visualModal.style.display = 'none'; });
    visualModal.addEventListener('click', e => {
      if (e.target === visualModal) visualModal.style.display = 'none';
    });
  }

  // Audio-Modal-Logik
  const btnAudio   = document.getElementById('btn-audio');
  const audioModal = document.getElementById('audio-modal');
  const audioClose = audioModal?.querySelector('.modal-close');
  if (btnAudio && audioModal && audioClose) {
    btnAudio.addEventListener('click', () => { audioModal.style.display = 'flex'; });
    audioClose.addEventListener('click', () => { audioModal.style.display = 'none'; });
    audioModal.addEventListener('click', e => {
      if (e.target === audioModal) audioModal.style.display = 'none';
    });
  }

  // === MEMORY (Simon Sagt) – HIER EINFÜGEN ===
  const memoryModal   = document.getElementById('memory-modal');
  const btnMemory     = document.getElementById('btn-memory');
  const btnSimonEasy  = document.getElementById('btn-simon-easy');
  const btnSimonMed   = document.getElementById('btn-simon-medium');
  const btnSimonHard  = document.getElementById('btn-simon-hard');

  btnMemory?.addEventListener('click', () => {
    if (memoryModal) {
      memoryModal.style.display = 'block';
      memoryModal.setAttribute('aria-hidden','false');
    }
  });
  memoryModal?.querySelector('.modal-close')?.addEventListener('click', () => {
    if (memoryModal) {
      memoryModal.style.display = 'none';
      memoryModal.setAttribute('aria-hidden','true');
    }
  });
  memoryModal?.addEventListener('click', (e) => {
    if (e.target === memoryModal) {
      memoryModal.style.display = 'none';
      memoryModal.setAttribute('aria-hidden','true');
    }
  });

  function startSimonFlow(variant, difficulty, modeId) {
    if (memoryModal) { memoryModal.style.display = 'none'; memoryModal.setAttribute('aria-hidden','true'); }
    if (typeof stopStartscreenMusic === 'function') stopStartscreenMusic();
    window.fdkBlockStartMusic?.();
    if (typeof setAudioToggleVisible === 'function') setAudioToggleVisible(false);
    if (typeof setStatsToggleVisible === 'function') setStatsToggleVisible(false);
    if (typeof prepareGridScreen === 'function') prepareGridScreen();

    if (typeof beginSession === 'function') {
      beginSession({ modeGroup:'memory', modeId, difficulty });
    }
    if (typeof variant === 'function') variant();
  }

  btnSimonEasy?.addEventListener('click',   () => startSimonFlow(startSimonEasy,   'easy',   'memory-simon-easy'));
  btnSimonMed ?.addEventListener('click',   () => startSimonFlow(startSimonMedium, 'medium', 'memory-simon-medium'));
  btnSimonHard?.addEventListener('click',   () => startSimonFlow(startSimonHard,   'hard',   'memory-simon-hard'));

  // === Grid-Modal-Logik (weiter im File) ===
  const btnGrid   = document.getElementById('btn-grid');
  const gridModal = document.getElementById('grid-modal');
  const gridClose = gridModal?.querySelector('.modal-close');
  if (btnGrid && gridModal && gridClose) {
    btnGrid.addEventListener('click', () => { gridModal.style.display = 'flex'; });
    gridClose.addEventListener('click', () => { gridModal.style.display = 'none'; });
    gridModal.addEventListener('click', e => {
      if (e.target === gridModal) gridModal.style.display = 'none';
    });
  }

  // Grid-Schwierigkeits-Buttons → getrennte Flows
  document.getElementById('btn-grid-easy')  ?.addEventListener('click', () => startGridEasyFlow());
  document.getElementById('btn-grid-medium')?.addEventListener('click', () => startGridMediumFlow());
  document.getElementById('btn-grid-hard')  ?.addEventListener('click', () => startGridHardFlow());

  // === GRID TIMING – Modal / Buttons ===
  const btnGridTiming   = document.getElementById('btn-gridtiming');
  const gridTimingModal = document.getElementById('gridtiming-modal');
  const gridTimingClose = gridTimingModal?.querySelector('.modal-close');

  if (btnGridTiming && gridTimingModal && gridTimingClose) {
    btnGridTiming.addEventListener('click', () => { gridTimingModal.style.display = 'flex'; });
    gridTimingClose.addEventListener('click', () => { gridTimingModal.style.display = 'none'; });
    gridTimingModal.addEventListener('click', e => {
      if (e.target === gridTimingModal) gridTimingModal.style.display = 'none';
    });
  }

  function startGridTimingFlow(starterFn, difficulty, modeId) {
    if (gridTimingModal) gridTimingModal.style.display = 'none';
    stopStartscreenMusic(); window.fdkBlockStartMusic?.();
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    if (typeof prepareGridScreen === 'function') prepareGridScreen();
    beginSession?.({ modeGroup:'gridtiming', modeId, difficulty });
    starterFn?.();
  }

  document.getElementById('btn-gridtiming-easy')?.addEventListener('click', () =>
    startGridTimingFlow(startGridTimingEasy, 'easy', 'grid-timing-easy')
  );
  document.getElementById('btn-gridtiming-medium')?.addEventListener('click', () =>
    startGridTimingFlow(startGridTimingMedium, 'medium', 'grid-timing-medium')
  );
  document.getElementById('btn-gridtiming-hard')?.addEventListener('click', () =>
    startGridTimingFlow(startGridTimingHard, 'hard', 'grid-timing-hard')
  );

  // Bounce-Animation (nur wenn nicht reduced-motion)
document.body.classList.add('use-js-bouncing');
if (!window.__decorStarted) {
  window.__decorStarted = true;   // verhindert Doppel-Start
  startDecorBouncing();
}


  console.log('▶ main.js initialisiert (Refactor + Modals + Bouncing + Audio + Trainings-Intro + Grid-Split + Restart + Musik-Guard + Audio/Stats-Buttons sichtbar nur Startscreen)');
});

// Helper: gemeinsame Vorbereitung für alle Grid-Varianten
function prepareGridScreen() {
  // kleine Helpers mit Null-Check
  const hide = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
  const show = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'block'; };

  // Grid-Modal schließen (falls offen)
  const gridModal = document.getElementById('grid-modal');
  if (gridModal) gridModal.style.display = 'none';

  // Screens umschalten (alles safe, auch wenn ein Element fehlt)
  hide('start-screen');
  hide('game-over-screen');
  hide('training-end-screen'); // kann fehlen -> egal
  show('game-screen');

  // HUD reset
  const scoreEl  = document.getElementById('score');  if (scoreEl)  scoreEl.textContent  = '0';
  const timerEl  = document.getElementById('timer');  if (timerEl)  timerEl.textContent  = '30';
  const streakEl = document.getElementById('streak'); if (streakEl) streakEl.textContent = '0';

  // Startscreen-Musik stoppen und blocken (wir sind im Spiel) + Buttons ausblenden
  stopStartscreenMusic();
  window.fdkBlockStartMusic?.();
  setAudioToggleVisible(false);
  setStatsToggleVisible(false);

  // Optional: Warnung, falls der Game-Screen wirklich fehlt
  if (!document.getElementById('game-screen')) {
    console.warn('[prepareGridScreen] #game-screen nicht gefunden – prüfe dein index.html');
  }
}

// Startfunktionen je Schwierigkeitsgrad (merken den Modus für „Weiter spielen“)
function startGridEasyFlow()   { 
  lastModeType = 'grid'; lastGridDifficulty = 'easy';   
  prepareGridScreen(); 
  beginSession({ modeGroup:'grid', modeId:'grid-easy', difficulty:'easy' });
  startGridEasy(); 
}
function startGridMediumFlow() { 
  lastModeType = 'grid'; lastGridDifficulty = 'medium'; 
  prepareGridScreen(); 
  beginSession({ modeGroup:'grid', modeId:'grid-medium', difficulty:'medium' });
  startGridMedium(); 
}
function startGridHardFlow()   { 
  lastModeType = 'grid'; lastGridDifficulty = 'hard';   
  prepareGridScreen(); 
  beginSession({ modeGroup:'grid', modeId:'grid-hard', difficulty:'hard' });
  startGridHard(); 
}

// Ende-Flow vom Grid-Modus (30s vorbei)
window.addEventListener('gridmode:finished', (ev) => {
  const { score, misses, bestStreak, duration = 30, difficulty } = ev.detail || {};

  // Run speichern – inkl. Mode-Metadaten
  persistOnce({
    score,
    misses,
    bestStreak,
    reactionTimes,
    playerName: (playerName || localStorage.getItem('lastPlayerName') || ''),
    durationSec: duration,
    modeGroup: 'grid',
    modeId: 'grid-' + (difficulty || lastGridDifficulty || ''),
    difficulty: (difficulty || lastGridDifficulty || '')
  });

  // Screens umschalten
  const gameScreen = document.getElementById('game-screen');
  const overScreen = document.getElementById('game-over-screen');
  if (gameScreen) gameScreen.style.display = 'none';
  if (overScreen) overScreen.style.display = 'block';

  // Musik auf Game-Over grundsätzlich erlauben (falls gewünscht)
  window.fdkAllowStartMusic?.();

  // Helper: erstes vorhandenes Ziel setzen
  const setText = (ids, val) => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) { el.textContent = val; return true; }
    }
    return false;
  };

  // Standardwerte
  setText(['final-score'], String(score ?? 0));
  setText(['final-misses'], String(misses ?? 0));
  setText(['final-persisted-best-streak','final-best-streak'], String(bestStreak ?? 0));

  // Trefferquote
  const attempts = (score ?? 0) + (misses ?? 0);
  const acc = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  setText(['final-accuracy'], acc + '%');

  // Spielername
  const name = playerName || localStorage.getItem('lastPlayerName') || '';
  setText(['final-player','final-player-name'], name);

  // Ø Reaktionszeit
  let avgSec = 0;
  if (Array.isArray(reactionTimes) && reactionTimes.length > 0) {
    const sum = reactionTimes.reduce((a, b) => a + b, 0);
    avgSec = sum / reactionTimes.length;
  }
  setText(['final-reaction-time','final-reaction','final-avg-reaction'],
          (avgSec ? avgSec.toFixed(2) : '0') + ' s');
});

// VISUELLES TRAINING (Easy/Medium/Hard)
window.addEventListener('visualmode:finished', (ev) => {
  const { score, misses, bestStreak, duration, difficulty, modeId } = ev.detail || {};

  persistOnce({
    score,
    misses,
    bestStreak,
    reactionTimes,
    playerName: (playerName || localStorage.getItem('lastPlayerName') || ''),
    durationSec: duration,
    modeGroup: 'visual',
    modeId,
    difficulty
  });

  const gameScreen = document.getElementById('game-screen');
  const overScreen = document.getElementById('game-over-screen');
  if (gameScreen) gameScreen.style.display = 'none';
  if (overScreen) overScreen.style.display = 'block';
  window.fdkAllowStartMusic?.();

  const setText = (ids, val) => { for (const id of ids) { const el = document.getElementById(id); if (el) { el.textContent = val; return true; } } return false; };

  setText(['final-score'], String(score ?? 0));
  setText(['final-misses'], String(misses ?? 0));
  setText(['final-persisted-best-streak','final-best-streak'], String(bestStreak ?? 0));

  const attempts = (score ?? 0) + (misses ?? 0);
  const acc = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  setText(['final-accuracy'], acc + '%');

  const name = playerName || localStorage.getItem('lastPlayerName') || '';
  setText(['final-player','final-player-name'], name);

  let avgSec = 0;
  if (Array.isArray(reactionTimes) && reactionTimes.length > 0) {
    const sum = reactionTimes.reduce((a, b) => a + b, 0);
    avgSec = sum / reactionTimes.length;
  }
  setText(['final-reaction-time','final-reaction','final-avg-reaction'],
          (avgSec ? avgSec.toFixed(2) : '0') + ' s');
});

// AUDIO CHALLENGE (Easy/Medium/Hard)
window.addEventListener('audiomode:finished', (ev) => {
  const { score, misses, bestStreak, duration, difficulty, modeId } = ev.detail || {};

  persistOnce({
    score,
    misses,
    bestStreak,
    reactionTimes,
    playerName: (playerName || localStorage.getItem('lastPlayerName') || ''),
    durationSec: duration,
    modeGroup: 'audio',
    modeId,
    difficulty
  });

  const gameScreen = document.getElementById('game-screen');
  const overScreen = document.getElementById('game-over-screen');
  if (gameScreen) gameScreen.style.display = 'none';
  if (overScreen) overScreen.style.display = 'block';
  window.fdkAllowStartMusic?.();

  const setText = (ids, val) => { for (const id of ids) { const el = document.getElementById(id); if (el) { el.textContent = val; return true; } } return false; };

  setText(['final-score'], String(score ?? 0));
  setText(['final-misses'], String(misses ?? 0));
  setText(['final-persisted-best-streak','final-best-streak'], String(bestStreak ?? 0));

  const attempts = (score ?? 0) + (misses ?? 0);
  const acc = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  setText(['final-accuracy'], acc + '%');

  const name = playerName || localStorage.getItem('lastPlayerName') || '';
  setText(['final-player','final-player-name'], name);

  let avgSec = 0;
  if (Array.isArray(reactionTimes) && reactionTimes.length > 0) {
    const sum = reactionTimes.reduce((a, b) => a + b, 0);
    avgSec = sum / reactionTimes.length;
  }
  setText(['final-reaction-time','final-reaction','final-avg-reaction'],
          (avgSec ? avgSec.toFixed(2) : '0') + ' s');
});

// === MEMORY (Simon Sagt) – Persist + Game Over ===
document.addEventListener('memorymode:finished', (ev) => {
  const d = ev?.detail || {};
  const {
    score = 0,
    misses = 0,
    bestStreak = 0,
    duration = 30,
    difficulty = 'normal',
    modeId = 'memory-simon',
    memoryMetrics
  } = d;

  if (typeof persistOnce === 'function') {
    persistOnce({
      modeGroup: 'memory',
      modeId,
      difficulty,
      score,
      misses,
      bestStreak,
      durationSec: duration,
      reactionTimes: [], // leave empty for memory mode
      // --- NEU:
      recallAvgPerItemSec: memoryMetrics?.recallAvgPerItemSec ?? null,
      itemsPerSec:         memoryMetrics?.itemsPerSec ?? null,
      playerName: (typeof playerName !== 'undefined' ? playerName : (localStorage.getItem('lastPlayerName') || ''))
    });
  }

  // Game-Over UI wie bei den anderen Modi
  const gameScreen = document.getElementById('game-screen');
  const overScreen = document.getElementById('game-over-screen');
  if (gameScreen) gameScreen.style.display = 'none';
  if (overScreen) overScreen.style.display = 'block';
  window.fdkAllowStartMusic?.();

  const setText = (ids, val) => { for (const id of ids) { const el = document.getElementById(id); if (el) { el.textContent = val; return true; } } return false; };

  setText(['final-score'], String(score));
  setText(['final-misses'], String(misses));
  setText(['final-persisted-best-streak','final-best-streak'], String(bestStreak));

  const attempts = score + misses;
  const acc = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  setText(['final-accuracy'], acc + '%');

  const name = (typeof playerName !== 'undefined' ? playerName : (localStorage.getItem('lastPlayerName') || ''));
  setText(['final-player','final-player-name'], name);

  // Ø Eingabe/Item anzeigen statt klassischer Ø-RT
  const perItem = memoryMetrics?.recallAvgPerItemSec ?? 0;
  const txt = perItem ? perItem.toFixed(2) + ' s/Item' : '–';
  setText(['final-reaction-time','final-reaction','final-avg-reaction'], txt);
});

/**
 * Bewegungs-Routine für Dekor-Kreise mit Kollision am Rand.
 * Respektiert reduced-motion und drosselt auf schwächerer Hardware.
 */
function startDecorBouncing() {
  const container = document.getElementById('start-screen');
  const size = 16;

  if (prefersReducedMotion) {
    Array.from(container.querySelectorAll('.decor-circle')).forEach(el => {
      const x = parseFloat(getComputedStyle(el).getPropertyValue('--left')) || 0;
      const y = parseFloat(getComputedStyle(el).getPropertyValue('--top')) || 0;
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
    });
    return;
  }

  function getBounds() {
    return container.getBoundingClientRect();
  }

  let bounds = getBounds();
  let frameCount = 0;
  const frameSkip = lowConcurrency ? 2 : 1;

  const circles = Array.from(container.querySelectorAll('.decor-circle')).map(el => {
    let b = container.getBoundingClientRect();
    if (b.width < 30 || b.height < 30) {
      b = { width: window.innerWidth || 320, height: window.innerHeight || 240 };
    }

    const initialX = parseFloat(getComputedStyle(el).getPropertyValue('--left')) || Math.random() * Math.max(1, b.width - size);
    const initialY = parseFloat(getComputedStyle(el).getPropertyValue('--top'))  || Math.random() * Math.max(1, b.height - size);

    el.style.position = 'absolute';
    el.style.left = initialX + 'px';
    el.style.top  = initialY + 'px';

    const sp = (Math.random() * 2 + 1);
    let vx = sp * (Math.random() < 0.5 ? 1 : -1);
    let vy = sp * (Math.random() < 0.5 ? 1 : -1);
    if (Math.abs(vx) + Math.abs(vy) < 0.5) { vx += 0.6; vy += 0.6; }

    return { el, x: initialX, y: initialY, vx, vy };
  });

  function animate() {
    frameCount++;
    if (frameCount % frameSkip === 0) {
      bounds = getBounds();

      // Wenn der Container unsichtbar/zu klein ist, Frame überspringen
      if (bounds.width < 30 || bounds.height < 30) {
        requestAnimationFrame(animate);
        return;
      }

      circles.forEach(obj => {
        obj.x += obj.vx;
        obj.y += obj.vy;

        if (obj.x <= 0) {
          obj.x = 0;
          obj.vx *= -1;
        } else if (obj.x + size >= bounds.width) {
          obj.x = bounds.width - size;
          obj.vx *= -1;
        }

        if (obj.y <= 0) {
          obj.y = 0;
          obj.vy *= -1;
        } else if (obj.y + size >= bounds.height) {
          obj.y = bounds.height - size;
          obj.vy *= -1;
        }

        obj.el.style.left = obj.x + 'px';
        obj.el.style.top  = obj.y + 'px';
      });
    }
    requestAnimationFrame(animate);
  }

  animate();
}

// GRID TIMING – Run abschließen
document.addEventListener('gridtiming:finished', (ev) => {
  const { score = 0, misses = 0, bestStreak = 0, duration = 60, difficulty = 'medium', modeId = 'grid-timing-medium', avgError = null } = ev.detail || {};

  // persistieren
  persistOnce({
    score,
    misses,
    bestStreak,
    reactionTimes, // falls du später z.B. Errors als "RT" nicht willst, kann man hier null übergeben
    playerName: (playerName || localStorage.getItem('lastPlayerName') || ''),
    durationSec: duration,
    modeGroup: 'gridtiming',
    modeId,
    difficulty,
    // optional extra Feld:
    avgErrorMs: avgError
  });

  // Game-Screen aus, Game-Over an
  const gameScreen = document.getElementById('game-screen');
  const overScreen = document.getElementById('game-over-screen');
  if (gameScreen) gameScreen.style.display = 'none';
  if (overScreen) overScreen.style.display = 'block';
  window.fdkAllowStartMusic?.();

  // UI füllen
  const setText = (ids, val) => { for (const id of ids) { const el = document.getElementById(id); if (el) { el.textContent = val; return true; } } return false; };
  setText(['final-score'], String(score));
  setText(['final-misses'], String(misses));
  setText(['final-persisted-best-streak','final-best-streak'], String(bestStreak));

  const attempts = (score ?? 0) + (misses ?? 0);
  const acc = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  setText(['final-accuracy'], acc + '%');

  const name = playerName || localStorage.getItem('lastPlayerName') || '';
  setText(['final-player','final-player-name'], name);

  // optional: avgError anzeigen anstelle von RT
  if (avgError != null) {
    setText(['final-reaction','final-reaction-time','final-avg-reaction'], Math.round(avgError) + ' ms');
  } else {
    // Fallback: vorhandene RT-Logik
    setText(['final-reaction-time','final-reaction','final-avg-reaction'], '–');
  }
});