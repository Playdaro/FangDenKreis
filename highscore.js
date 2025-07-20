// highscore.js – zentrales Modus-Highscore-System (Refactor-Version)

// Maximale Punkte pro Modus
export const MODE_MAX_SCORE = 333;

// Gewichtung & Basis-Reaktionszeit
const WEIGHT = { hits: 0.6, miss: 0.2, react: 0.2 };
const BASELINE_REACTION = 1.5; // Sekunden – ab hier kein Reaktionsbonus mehr

/**
 * Berechnet normierten Score (0 .. MODE_MAX_SCORE)
 * hits        = tatsächliche Treffer
 * misses      = Fehlklicks
 * avgReaction = Ø Reaktionszeit (Sekunden)
 * appearTime  = Spawn-Intervall des Hauptkreises in ms
 * maxMisses   = Miss-Limit für Normierung (Konfig)
 * durationSec = Spielzeit in Sekunden (Standard 30)
 */
export function computeModeScore(
  hits,
  misses,
  avgReaction,
  appearTime,
  maxMisses,
  durationSec = 30
) {
  // Basierend auf festem Intervall (ignoriert Sofort-Respawn-Effekt)
  const maxPossibleHits = durationSec / (appearTime / 1000);

  const hitsNorm  = Math.min(hits / maxPossibleHits, 1);
  const missNorm  = maxMisses > 0 ? Math.max((maxMisses - misses) / maxMisses, 0) : 0;
  const reactNorm = Math.max((BASELINE_REACTION - avgReaction) / BASELINE_REACTION, 0);

  const raw = WEIGHT.hits * hitsNorm
            + WEIGHT.miss * missNorm
            + WEIGHT.react * reactNorm;

  return Math.round(raw * MODE_MAX_SCORE);
}

/** Einzel-Highscore eines Modus lesen */
export function getModeHighscore(mode) {
  return +localStorage.getItem(`highscore_${mode}`) || 0;
}

/** Gesamt-Highscore (easy + medium + hard) neu berechnen & speichern */
export function updateTotalHighscore() {
  const total = ['easy', 'medium', 'hard']
    .map(getModeHighscore)
    .reduce((a, b) => a + b, 0);
  localStorage.setItem('highscore_total', total);
  return total;
}

/** Gesamt-Highscore nur lesen */
export function getTotalHighscore() {
  return +localStorage.getItem('highscore_total') || 0;
}

/**
 * (Vorbereitung für Versionierung – derzeit nur Alias)
 * Bei künftiger Formeländerung: return `modeScore_v1_${mode}`
 */
export function getVersionedModeKey(mode) {
  return `highscore_${mode}`;
}

/**
 * Speichert (falls besser) den Modus-Highscore und aktualisiert den Gesamtwert.
 * Gibt den berechneten Score (aktueller Run) zurück.
 */
export function saveModeScore(
  mode,
  {
    hits,
    misses,
    avgReaction,
    appearTime,
    maxMisses,
    durationSec = 30
  }
) {
  const score = computeModeScore(
    hits,
    misses,
    avgReaction,
    appearTime,
    maxMisses,
    durationSec
  );

  const oldBest = getModeHighscore(mode);
  if (score > oldBest) {
    localStorage.setItem(`highscore_${mode}`, score);
  }

  updateTotalHighscore();
  return score;
}

/**
 * Aktualisiert die Highscore-Anzeige im Startbildschirm.
 * Erwartet: #hs-easy, #hs-medium, #hs-hard, #hs-total
 */
export function updateHighscoreUI() {
  const elEasy  = document.getElementById('hs-easy');
  const elMed   = document.getElementById('hs-medium');
  const elHard  = document.getElementById('hs-hard');
  const elTotal = document.getElementById('hs-total');

  if (!elEasy || !elMed || !elHard || !elTotal) return;

  elEasy.textContent  = getModeHighscore('easy');
  elMed.textContent   = getModeHighscore('medium');
  elHard.textContent  = getModeHighscore('hard');
  elTotal.textContent = getTotalHighscore();
}
