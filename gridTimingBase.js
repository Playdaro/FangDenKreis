// gridTimingBase.js – Basis für "Grid Timing"
// startGridTiming({durationSec, windowMs, minDelay, maxDelay, lockoutMs, difficulty, modeId})

import { resetGameState, addManagedListener, registerInterval } from './reset.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export function startGridTiming(cfg) {
  const {
    durationSec = 45,
    windowMs = 120,       // Breite des Ziel-Fensters
    minDelay = 900,       // min Wartezeit
    maxDelay = 1800,      // max Wartezeit
    lockoutMs = 300,      // Block nach Miss
    difficulty = 'medium',
    modeId = 'grid-timing-medium',
  } = cfg || {};

  resetGameState?.();

  // HUD reset
  $('score').textContent = '0';
  $('streak').textContent = '0';
  $('timer').textContent = String(durationSec);

  let score = 0, misses = 0, bestStreak = 0, streak = 0;
  let reactionErrors = []; // |Delta zum Fensterzentrum|
  let timer = durationSec;
  let countdownInterval = null;

  let canClick = false;
  let windowCenter = null;

  const game = $('grid-game');
  game.innerHTML = '';
  game.style.display = 'grid';
  Object.assign(game.style, {
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: '6px',
    width: 'min(90vw,480px)',
    height: 'min(90vw,480px)',
    margin: '12px auto'
  });

  // nur 1 aktives Feld (z. B. Mitte)
  const idx = 4;
  const btn = document.createElement('button');
  btn.className = 'grid-cell';
  btn.dataset.idx = idx;
  Object.assign(btn.style, {
    border: '2px solid #444', borderRadius: '12px',
    aspectRatio: '1/1',
    background: '#222', color: '#ddd',
    transition: 'background 150ms ease'
  });
  game.appendChild(btn);

  function setFeedback(color) {
    btn.style.background = color;
    setTimeout(() => { btn.style.background = '#222'; }, 200);
  }

  // Timer läuft nur, wenn man wirklich spielt
  countdownInterval = setInterval(() => {
    timer--;
    $('timer').textContent = String(timer);
    if (timer <= 0) {
      clearInterval(countdownInterval);
      finish('ended');
    }
  }, 1000);
  registerInterval?.(countdownInterval);

  async function round() {
    canClick = false;
    btn.disabled = true;

    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    await sleep(delay);

    // Fenster aktivieren
    canClick = true;
    btn.disabled = false;
    windowCenter = performance.now() + windowMs / 2;

    setTimeout(() => {
      canClick = false;
      btn.disabled = true;
      // Wenn nicht geklickt → Miss
      if (windowCenter) {
        misses++;
        streak = 0;
        setFeedback('#c0392b');
        $('streak').textContent = streak;
      }
      if (timer > 0) round();
    }, windowMs);
  }

  btn.addEventListener('click', () => {
    if (!canClick) {
      // Zu früh/zu spät → Miss + Lockout
      misses++;
      streak = 0;
      setFeedback('#c0392b');
      $('streak').textContent = streak;
      canClick = false;
      btn.disabled = true;
      setTimeout(() => { if (timer > 0) round(); }, lockoutMs);
      return;
    }

    // Treffer innerhalb des Fensters
    const now = performance.now();
    const delta = now - windowCenter;
    reactionErrors.push(Math.abs(delta));

    score++;
    streak++;
    if (streak > bestStreak) bestStreak = streak;
    $('score').textContent = score;
    $('streak').textContent = streak;
    setFeedback(Math.abs(delta) < windowMs/4 ? '#2ecc71' : '#f1c40f');

    canClick = false;
    btn.disabled = true;
    if (timer > 0) round();
  });

  function finish(reason = 'ended') {
    const detail = {
      reason, score, misses, bestStreak,
      duration: durationSec,
      difficulty,
      modeId,
      avgError: reactionErrors.length
        ? reactionErrors.reduce((a,b)=>a+b,0)/reactionErrors.length
        : null
    };
    document.dispatchEvent(new CustomEvent('gridtiming:finished', { detail }));
  }

  round();
}
