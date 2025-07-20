// training.js
import {
  setDifficulty,
  resetScore,
  resetMisses,
  clearReactionTimes,
  setMainInterval,
  clearCircleIntervals,
  setCurrentLevel,
  setXP,
  incrementXP,
  setLastMoveTime,
  stats,
  currentLevel,
  xp,
  interval,
  countdownInterval,
  misses,
  lastMoveTime,
  levels,
  circle,
  scoreDisplay,
  startScreen,
  gameScreen,
  gameOverScreen,
  resetBtn,
  levelDisplay,
  xpFill,
  xpAmount,
  moveCircle,
  startCountdown,
  incrementMisses,
  endTraining
} from './core.js';

let appearTime, maxMisses, requiredHits;

/** Klick‑Handler im Trainingsmodus */
function handleTrainingClick() {
  // 1) XP erhöhen & speichern
  incrementXP();

  // 2) XP‑Leiste und Zahl aktualisieren
  xpFill.style.width   = `${stats.xp % 100}%`;
  xpAmount.textContent = `${stats.xp} XP`;

  // 3) Level‑Up prüfen (jede 100 XP)
  const nextThreshold = (currentLevel + 1) * 100;
  console.log('DEBUG:', 'XP=', stats.xp, 'currentLevel=', currentLevel, 'threshold=', nextThreshold);
  if (stats.xp >= nextThreshold) {
  // 1) Lokales neues Level berechnen
  const newLevel = currentLevel + 1;
  // 2) Core‑State aktualisieren
  setCurrentLevel(newLevel);
  // 3) UI anzeigen
  levelDisplay.textContent = `Level ${newLevel}`;
  // 4) Speed‑Parameter neu setzen
  appearTime = levels[newLevel]?.appearTime || appearTime;
  setMainInterval(trainingTick, appearTime);
}

  // 4) Kreis neu positionieren & Timer zurücksetzen
  moveCircle();
  setLastMoveTime(Date.now());
}

/** Ein Tick im Trainingsmodus: Miss‑Logik + Kreis bewegen */
function trainingTick() {
  if (Date.now() - lastMoveTime > appearTime) {
    incrementMisses();
    if (misses > maxMisses) {
      return endTraining();
    }
  }
  moveCircle();
}

/** Startet den Trainingsmodus */
export function startTraining() {
  // 1) Alle laufenden Intervalle beenden
  clearInterval(interval);
  clearCircleIntervals();
  clearInterval(countdownInterval);

  // 2) Stats laden
  Object.assign(
    stats,
    JSON.parse(localStorage.getItem('trainingStats')) || { bestLevel: 0, xp: 0 }
  );
  setCurrentLevel(stats.bestLevel);
  setXP(stats.xp);

  // 3) Modus und Spielzustand zurücksetzen
  setDifficulty('training');
  resetScore();
  resetMisses();
  clearReactionTimes();
  scoreDisplay.textContent = '0';

  // 4) Level‑Parameter übernehmen
  const cfg = levels[stats.bestLevel] || {};
  appearTime   = cfg.appearTime   || 3000;
  maxMisses    = cfg.maxMisses    || Infinity;
  requiredHits = cfg.requiredHits || 10;

  // 5) UI initialisieren
  levelDisplay.textContent = `Level ${stats.bestLevel}`;
  xpFill.style.width       = `${stats.xp % 100}%`;
  xpAmount.textContent     = `${stats.xp} XP`;

  // 6) Screens umschalten
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';
  resetBtn.style.display       = 'inline-block';

  // 7) Klick‑Handler anhängen
circle.addEventListener('click', handleTrainingClick);
  
  // Back‑Button neu belegen und den Listener sauber abmelden
  document.getElementById('back-button').onclick = () => {
    circle.removeEventListener('click', handleTrainingClick);
    clearInterval(interval);
    clearInterval(countdownInterval);
    clearCircleIntervals();
    gameScreen.style.display = 'none';
    startScreen.style.display = 'block';
    resetBtn.style.display = 'none';
  };


  // 8) Trainings‑Loop starten
  moveCircle();
  setMainInterval(trainingTick, appearTime);

  // 9) Countdown (60 s)
  startCountdown(60);
}
