// main.js – Refactor + Best-Streak-Anzeige + Modal-Logik + Dekor-Bouncing

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

window.addEventListener('DOMContentLoaded', () => {
  // Core Setup (DOM-Refs etc.)
  initCore();

  // Buttons (Modi)
  document.getElementById('btn-easy')      .addEventListener('click', startEasyMode);
  document.getElementById('btn-medium')    .addEventListener('click', startMediumMode);
  document.getElementById('btn-hard')      .addEventListener('click', startHardMode);
  document.getElementById('btn-training')  .addEventListener('click', startTraining);
  document.getElementById('btn-easyaudio').addEventListener('click', startEasyAudioColorMode);
  document.getElementById('btn-mediaudio') .addEventListener('click', startMediumAudioColorMode);
  document.getElementById('btn-hardaudio') .addEventListener('click', startHardAudioColorMode);
  document.getElementById('btn-timedtrain').addEventListener('click', startTrainingTimedColor);

  // Intro → Name Screen
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
      const name = nameInput.value.trim() || 'Anonym';
      document.getElementById('name-screen').style.display = 'none';
      document.getElementById('start-screen').style.display = 'block';
      localStorage.setItem('playerName', name);
    });
  }

  // Modal-Logik für Visuelles Training (Speed-Modi)
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

  // Modal-Logik für Sound-Challenge (Hör-Reaktion)
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

  // Starte die Bounce-Animation für die Dekor-Kreise
  document.body.classList.add('use-js-bouncing');
  startDecorBouncing();

  console.log('▶ main.js initialisiert (Refactor + Modals + Bouncing)');
});


function startDecorBouncing() {
  const container = document.getElementById('start-screen');
  const size = 16;

  // Initialisiere alle Kreise mit Startpositionen aus CSS-Variablen
  const circles = Array.from(container.querySelectorAll('.decor-circle')).map(el => {
    const x = parseFloat(getComputedStyle(el).getPropertyValue('--left'));
    const y = parseFloat(getComputedStyle(el).getPropertyValue('--top'));
    const vx = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? 1 : -1);
    const vy = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? 1 : -1);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    return { el, x, y, vx, vy };
  });

  // Animationsschleife mit aktuellen Bounds
  function animate() {
    const rect = container.getBoundingClientRect();
    circles.forEach(obj => {
      obj.x += obj.vx;
      obj.y += obj.vy;

      if (obj.x <= 0) {
        obj.x = 0;
        obj.vx *= -1;
      } else if (obj.x + size >= rect.width) {
        obj.x = rect.width - size;
        obj.vx *= -1;
      }
      if (obj.y <= 0) {
        obj.y = 0;
        obj.vy *= -1;
      } else if (obj.y + size >= rect.height) {
        obj.y = rect.height - size;
        obj.vy *= -1;
      }

      obj.el.style.left = obj.x + 'px';
      obj.el.style.top  = obj.y + 'px';
    });
    requestAnimationFrame(animate);
  }
  animate();
}
