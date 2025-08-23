// main.js – Refactor + Best-Streak-Anzeige + Modal-Logik + Dekor-Bouncing + Startscreen-Audio + Reduced-Motion / Performance-Fallback + Trainings-Intro

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

  // Spielzeit: heute & 7 Tage
  const todayKey = (new Date()).toISOString().slice(0,10); // YYYY-MM-DD lokal reicht hier grob
  const todaySec = play?.byDay?.[todayKey]?.seconds || 0;
  let sevenDays = 0;
  if (play?.byDay) {
    const days = Object.keys(play.byDay).sort().slice(-7);
    sevenDays = days.reduce((sum, d) => sum + (play.byDay[d]?.seconds || 0), 0);
  }
  safeText('s-today', fmtSec(todaySec));
  safeText('s-7d', fmtSec(sevenDays));

  // Bestwerte (global)
  const g = bests?.global || {};
  safeText('b-bestscore', String(g.bestScore ?? 0));
  safeText('b-longest', fmtSec(g.longestSessionSec || 0));
  safeText('b-avg', g.bestAvgRt != null ? fmtRt(g.bestAvgRt) : '–');
  safeText('b-acc', g.bestAccuracy != null ? fmtPct(g.bestAccuracy) : '–');
  safeText('b-hpm', g.bestHpm != null ? (g.bestHpm.toFixed(1)) : '–');
  safeText('b-streak', String(play?.dayStreak || 0));

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
  initStatsButton();

  // Standard: außerhalb Startscreen erstmal verstecken
  setAudioToggleVisible(false);
  setStatsToggleVisible(false);

  // Mode-Buttons: beim Start Spiel **blocken** wir Musik und stoppen sie
  document.getElementById('btn-easy')  ?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    startEasyMode(); 
  });
  document.getElementById('btn-medium')?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    startMediumMode(); 
  });
  document.getElementById('btn-hard')  ?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    startHardMode(); 
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

  // Audio-Training / andere Modi
  document.getElementById('btn-easyaudio')?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    startEasyAudioColorMode(); 
  });
  document.getElementById('btn-mediaudio')?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
    startMediumAudioColorMode(); 
  });
  document.getElementById('btn-hardaudio')?.addEventListener('click', () => { 
    stopStartscreenMusic(); window.fdkBlockStartMusic?.(); 
    setAudioToggleVisible(false); setStatsToggleVisible(false);
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

  // NEU: „Weiter spielen“ → zuletzt gespielten Grid-Modus erneut starten
  const restartBtn = document.getElementById('restart-button');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      // Game-Over ausblenden
      document.getElementById('game-over-screen').style.display = 'none';

      if (lastModeType === 'grid') {
        if (lastGridDifficulty === 'easy')      { startGridEasyFlow(); }
        else if (lastGridDifficulty === 'medium'){ startGridMediumFlow(); }
        else if (lastGridDifficulty === 'hard')  { startGridHardFlow(); }
        else { window.fdkAllowStartMusic?.(); showStartScreen(); }
      } else {
        // Falls „Weiter spielen“ aus einem anderen Modus kam:
        window.fdkAllowStartMusic?.();
        showStartScreen();
      }
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

  // Grid-Modal-Logik
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

  // Bounce-Animation (nur wenn nicht reduced-motion)
  document.body.classList.add('use-js-bouncing');
  startDecorBouncing();

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
  const { score, misses, bestStreak } = ev.detail || {};

  // Run in localStorage speichern (inkl. Spielzeit/Ø/Median/HPM)
  finalizeRunAndPersist({
    score,
    misses,
    bestStreak,
    reactionTimes, // kommt aus core.js (Import vorhanden)
    playerName: (playerName || localStorage.getItem('lastPlayerName') || '')
    // durationSec: ev.detail?.duration  // optional; wenn weggelassen, wird tsStart genutzt
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

  // Ø Reaktionszeit aus core.reactionTimes
  let avgSec = 0;
  if (Array.isArray(reactionTimes) && reactionTimes.length > 0) {
    const sum = reactionTimes.reduce((a, b) => a + b, 0);
    avgSec = sum / reactionTimes.length;
  }
  setText(['final-reaction-time','final-reaction','final-avg-reaction'],
          (avgSec ? avgSec.toFixed(2) : '0') + ' s');
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
    const initialX = parseFloat(getComputedStyle(el).getPropertyValue('--left')) || Math.random() * (bounds.width - size);
    const initialY = parseFloat(getComputedStyle(el).getPropertyValue('--top')) || Math.random() * (bounds.height - size);
    el.style.left = initialX + 'px';
    el.style.top  = initialY + 'px';
    const vx = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? 1 : -1);
    const vy = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? 1 : -1);
    return { el, x: initialX, y: initialY, vx, vy };
  });

  function animate() {
    frameCount++;
    if (frameCount % frameSkip === 0) {
      bounds = getBounds();
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
