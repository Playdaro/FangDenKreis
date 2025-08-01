// main.js – Refactor + Best-Streak-Anzeige + Modal-Logik + Dekor-Bouncing + Startscreen-Audio + Reduced-Motion / Performance-Fallback

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

// === Feature flags / environment checks ===
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowConcurrency = (() => {
  const hc = navigator.hardwareConcurrency || 4;
  const dm = navigator.deviceMemory || 4; // in GB, may be undefined in some browsers
  return hc <= 2 || (dm && dm <= 2);
})();

// === Startscreen-Audio ===
let startScreenAudio = null;
let startScreenAudioEnabled = false;
let startScreenAudioFadeInterval = null;

function initStartscreenAudio() {
  if (startScreenAudio) return;
  startScreenAudio = new Audio('Frontmelodie.wav'); // muss im gleichen Ordner liegen
  startScreenAudio.loop = true;
  startScreenAudio.preload = 'auto';
  startScreenAudio.volume = 0;
  startScreenAudio.muted = false;

  // Mute/Unmute-Button nur für Startscreen
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
    // Autoplay blockiert bis zur Interaktion; wird durch waitForInteractionToStartAudio gedeckt
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

/**
 * Wartet auf erste Benutzerinteraktion (Klick oder Tastendruck) um Audio zu starten.
 */
function waitForInteractionToStartAudio() {
  const handler = () => {
    enableStartscreenMusicOnce();
    document.removeEventListener('click', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('click', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
}

/**
 * Hinweis anzeigen, dass Musik durch Tap aktiviert wird.
 */
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

/**
 * Zeigt den Startscreen, aktualisiert UI, und bereitet Audio-Start vor.
 */
function showStartScreen() {
  ['info-screen', 'name-screen', 'game-screen', 'game-over-screen', 'training-end-screen'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const start = document.getElementById('start-screen');
  if (start) start.style.display = 'block';

  updateHighscoreUI();
  updateBestStreakDisplay();

  // Musik erst nach wirklicher Interaction starten, Hinweis geben
  showAudioPrompt();
  waitForInteractionToStartAudio();
}

window.addEventListener('DOMContentLoaded', () => {
  initCore();
  initStartscreenAudio();

  // Mode-Buttons: Musik stoppen, dann Modus starten
  document.getElementById('btn-easy')      .addEventListener('click', () => { stopStartscreenMusic(); startEasyMode(); });
  document.getElementById('btn-medium')    .addEventListener('click', () => { stopStartscreenMusic(); startMediumMode(); });
  document.getElementById('btn-hard')      .addEventListener('click', () => { stopStartscreenMusic(); startHardMode(); });
  document.getElementById('btn-training')  .addEventListener('click', () => { stopStartscreenMusic(); startTraining(); });
  document.getElementById('btn-easyaudio').addEventListener('click', () => { stopStartscreenMusic(); startEasyAudioColorMode(); });
  document.getElementById('btn-mediaudio') .addEventListener('click', () => { stopStartscreenMusic(); startMediumAudioColorMode(); });
  document.getElementById('btn-hardaudio') .addEventListener('click', () => { stopStartscreenMusic(); startHardAudioColorMode(); });
  document.getElementById('btn-timedtrain').addEventListener('click', () => { stopStartscreenMusic(); startTrainingTimedColor(); });

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
      showStartScreen(); // echte Interaktion -> Musik startet
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

  // Zurück zum Startscreen
  const backBtn = document.getElementById('back-button');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showStartScreen();
    });
  }
  const gameoverBack = document.getElementById('gameover-back-button');
  if (gameoverBack) {
    gameoverBack.addEventListener('click', () => {
      showStartScreen();
    });
  }

  updateHighscoreUI();
  updateBestStreakDisplay();

  // Modal-Logik Visuell
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

  // Modal-Logik Audio
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

  // Bounce-Animation (wenn nicht reduced-motion)
  document.body.classList.add('use-js-bouncing');
  startDecorBouncing();

  console.log('▶ main.js initialisiert (Refactor + Modals + Bouncing + Audio)');
});


/**
 * Bewegungs-Routine für Dekor-Kreise mit Kollision am Rand.
 * Berücksichtigt reduced-motion und niedrige Hardware für Throttling.
 */
function startDecorBouncing() {
  const container = document.getElementById('start-screen');
  const size = 16;

  // Wenn reduced motion aktiv: keine Bewegung
  if (prefersReducedMotion) {
    // Setze initiale Positionen aus CSS-Variablen, keine Animation
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
  const frameSkip = lowConcurrency ? 2 : 1; // auf schwacher Hardware nur jede zweite Frame aktualisieren

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
