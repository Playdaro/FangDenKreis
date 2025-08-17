// main.js – Refactor + Best-Streak-Anzeige + Modal-Logik + Dekor-Bouncing + Startscreen-Audio + Reduced-Motion / Performance-Fallback + Trainings-Intro

import { 
  initCore, 
  updateBestStreakDisplay 
} from './core.js';

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

function enableStartscreenMusicOnce() {
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

  showAudioPrompt();
  waitForInteractionToStartAudio();
}

window.addEventListener('DOMContentLoaded', () => {
  // Core initialisieren
  initCore();

  // Audio vorbereiten
  initStartscreenAudio();

  // Mode-Buttons: beim Start stop Music und dann starten
  document.getElementById('btn-easy')?.addEventListener('click', () => { stopStartscreenMusic(); startEasyMode(); });
  document.getElementById('btn-medium')?.addEventListener('click', () => { stopStartscreenMusic(); startMediumMode(); });
  document.getElementById('btn-hard')?.addEventListener('click', () => { stopStartscreenMusic(); startHardMode(); });
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
  document.getElementById('btn-easyaudio')?.addEventListener('click', () => { stopStartscreenMusic(); startEasyAudioColorMode(); });
  document.getElementById('btn-mediaudio')?.addEventListener('click', () => { stopStartscreenMusic(); startMediumAudioColorMode(); });
  document.getElementById('btn-hardaudio')?.addEventListener('click', () => { stopStartscreenMusic(); startHardAudioColorMode(); });
  document.getElementById('btn-timedtrain')?.addEventListener('click', () => { stopStartscreenMusic(); startTrainingTimedColor(); });

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
      showStartScreen();
    });
  }
  const gameoverBack = document.getElementById('gameover-back-button');
  if (gameoverBack) {
    gameoverBack.addEventListener('click', () => {
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
        else { showStartScreen(); }
      } else {
        // Falls „Weiter spielen“ aus einem anderen Modus kam:
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

  console.log('▶ main.js initialisiert (Refactor + Modals + Bouncing + Audio + Trainings-Intro + Grid-Split + Restart)');
});

// Helper: gemeinsame Vorbereitung für alle Grid-Varianten
function prepareGridScreen() {
  const gridModal = document.getElementById('grid-modal');
  if (gridModal) gridModal.style.display = 'none';

  // Screens umschalten
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('game-over-screen').style.display = 'none';
  document.getElementById('training-end-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';

  // HUD reset
  const scoreEl = document.getElementById('score'); if (scoreEl) scoreEl.textContent = '0';
  const timerEl = document.getElementById('timer'); if (timerEl) timerEl.textContent = '30';
  const streakEl = document.getElementById('streak'); if (streakEl) streakEl.textContent = '0';

  // Startscreen-Musik stoppen
  stopStartscreenMusic();
}

// Startfunktionen je Schwierigkeitsgrad (merken den Modus für „Weiter spielen“)
function startGridEasyFlow()   { lastModeType = 'grid'; lastGridDifficulty = 'easy';   prepareGridScreen(); startGridEasy(); }
function startGridMediumFlow() { lastModeType = 'grid'; lastGridDifficulty = 'medium'; prepareGridScreen(); startGridMedium(); }
function startGridHardFlow()   { lastModeType = 'grid'; lastGridDifficulty = 'hard';   prepareGridScreen(); startGridHard(); }

// Ende-Flow vom Grid-Modus (30s vorbei)
window.addEventListener('gridmode:finished', (ev) => {
  const { score, misses, bestStreak } = ev.detail || {};

  // Game-Screen aus, Game-Over an
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('game-over-screen').style.display = 'block';

  // Felder füllen
  const finalScore = document.getElementById('final-score');
  const finalMiss  = document.getElementById('final-misses');
  const finalBS    = document.getElementById('final-persisted-best-streak');
  const finalAcc   = document.getElementById('final-accuracy');

  if (finalScore) finalScore.textContent = String(score ?? 0);
  if (finalMiss)  finalMiss.textContent  = String(misses ?? 0);
  if (finalBS)    finalBS.textContent    = String(bestStreak ?? 0);

  // Accuracy: Treffer = score, Versuche = score + misses
  const attempts = (score ?? 0) + (misses ?? 0);
  const acc = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  if (finalAcc) finalAcc.textContent = acc + '%';
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
