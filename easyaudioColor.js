// easyaudioColor.js – Easy Audio-Color mit Timer, Reaktionszeiten, Fehlklicks & Button-Handlern
// Refactored: reset-sicher, managed Listener, Timer-Registrierung

import {
  // DOM & State
  circle,
  circle2,
  gameArea,
  scoreDisplay,
  startScreen,
  gameScreen,
  gameOverScreen,
  reactionTimes,
  lastMoveTime,
  // Mutatoren
  resetScore,
  resetMisses,
  incrementScore,
  incrementMisses,
  setLastMoveTime,
  // Core-Funktionen
  moveCircle,
  moveCircleSafely,
  triggerMissFlash,
  setEndGame,
  baseEndGame,
  startCountdown,
  // ⚠️ für Timer-Registrierung
  countdownInterval
} from './core.js';

// Reset/Registry
import {
  resetGameState,
  addManagedListener,
  registerInterval
} from './reset.js';

// Stats (Session-Start für Spielzeit/HPM/Aggregate)
import { beginSession } from './stats.js';

// 5 Basisfarben
const COLORS = [
  { name: 'Rot',     code: '#e74c3c' },
  { name: 'Blau',    code: '#3498db' },
  { name: 'Grün',    code: '#2ecc71' },
  { name: 'Gelb',    code: '#f1c40f' },
  { name: 'Violett', code: '#9b59b6' }
];

let correctColor;

// TTS-Wrapper: sagt "Lila" statt "Violett"
function speak(text) {
  if (!text) return;
  // Nur die Sprachausgabe umbiegen – Logik/Datensätze bleiben "Violett"
  if (String(text).toLowerCase() === 'violett') text = 'Lila';

  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'de-DE'; // bessere deutsche Aussprache
    window.speechSynthesis.speak(msg);
  }
}


// Platziere zwei Kreise & sage eine Farbe
function spawnCircles() {
  const [a, b] = COLORS.sort(() => 0.5 - Math.random()).slice(0, 2);

  circle.dataset.color  = a.name;
  circle2.dataset.color = b.name;

  circle.style.background  = a.code;
  circle2.style.background = b.code;
  circle.style.display     = 'block';
  circle2.style.display    = 'block';

  moveCircle();                 // erster Kreis frei platzieren
  moveCircleSafely(circle2);    // zweiter Kreis sicher platzieren

  setLastMoveTime(Date.now());

  correctColor = Math.random() < 0.5 ? a.name : b.name;
  speak(correctColor);
}

// Klick auf Kreis
function handleCircleClick(e) {
  const chosen = e.target.dataset.color;
  if (!chosen) return;

  if (chosen === correctColor) {
    reactionTimes.push((Date.now() - lastMoveTime) / 1000);
    incrementScore();
    scoreDisplay.textContent = String(+scoreDisplay.textContent + 1);
    spawnCircles();
  } else {
    incrementMisses();
    triggerMissFlash();
  }
}

// Klick neben die Kreise
function handleMissClick(e) {
  if (e.target === circle || e.target === circle2) return;
  incrementMisses();
  triggerMissFlash();
}

// EndGame-Wrapper
function endGameAudioColor() {
  // Standardisierte Endauswertung
  baseEndGame();

  // === Event für main.js (Stats + Game-Over-Befüllung) ===
  window.dispatchEvent(new CustomEvent('audiomode:finished', {
    detail: {
      reason: 'ended',
      score: Number(scoreDisplay.textContent) || 0,
      misses: 0,                 // Misses werden in baseEndGame/Stats aus Attempts abgeleitet; wenn du ein eigenes Miss-Counter-Feld hast, setz es hier
      bestStreak: 0,             // Audio-Color hat aktuell keine Streak-Logik
      duration: 30,
      difficulty: 'easy',
      modeId: 'audio-easy'
    }
  }));
}

// Start Easy Audio-Color Modus
export function startEasyAudioColorMode() {
  // 0) Sauberer Start (killt alte Timer/Listener, versteckt Kreise/Grid, setzt HUD zurück)
  resetGameState();

  // 1) Score/Miss/RT local für diese Runde zurücksetzen
  resetScore();
  resetMisses();
  reactionTimes.length = 0;
  scoreDisplay.textContent = '0';

  // 2) EndGame-Hook setzen und Countdown starten (+ registrieren)
  setEndGame(endGameAudioColor);
  startCountdown(30);
  registerInterval(countdownInterval);

  // 3) Screens umschalten
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';

  // 3a) Startscreen-Musik hart stoppen & blocken; Audio-/Stats-Buttons ausblenden
  window.stopStartscreenMusic?.();
  window.fdkBlockStartMusic?.();
  const audioToggle = document.getElementById('start-audio-toggle');
  if (audioToggle) audioToggle.style.display = 'none';
  const statsToggle = document.getElementById('stats-toggle');
  if (statsToggle) statsToggle.style.display = 'none';

  // 3b) Session für Stats beginnen (für Spielzeit/HPM/Aggregate)
  beginSession({ modeGroup: 'audio', modeId: 'audio-easy', difficulty: 'easy' });

  // 4) Listener managed registrieren
  if (circle)  addManagedListener(circle,  'click', handleCircleClick);
  if (circle2) addManagedListener(circle2, 'click', handleCircleClick);
  if (gameArea) addManagedListener(gameArea, 'click', handleMissClick);

  // Back/Restart/GameOver Buttons – ebenfalls managed + mit Reset
  const backButton     = document.getElementById('back-button');
  const restartBtn     = document.getElementById('restart-button');
  const goBackGameOver = document.getElementById('gameover-back-button');

  if (backButton) {
    addManagedListener(backButton, 'click', () => {
      resetGameState();
      gameScreen.style.display  = 'none';
      startScreen.style.display = 'block';
    });
  }
  if (restartBtn) {
    addManagedListener(restartBtn, 'click', () => {
      resetGameState();
      startEasyAudioColorMode();
    });
  }
  if (goBackGameOver) {
    addManagedListener(goBackGameOver, 'click', () => {
      resetGameState();
      gameOverScreen.style.display = 'none';
      startScreen.style.display    = 'block';
    });
  }

  // 5) Erste Runde
  spawnCircles();
}
