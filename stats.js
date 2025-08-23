// stats.js – Runs/Bestwerte/Spielzeit in localStorage + Session-Recorder

const RUNS_KEY     = 'runs_v1';
const BESTS_KEY    = 'bests_v1';
const PLAYTIME_KEY = 'playtime_v1';

// ---------- Helpers ----------
function readJson(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch { return fallback; }
}
function writeJson(key, obj) { localStorage.setItem(key, JSON.stringify(obj)); }

function ymdLocal(d = new Date()) {
  // YYYY-MM-DD in LOKALZEIT (nicht UTC)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function dayNumber(str) {
  const [y,m,d] = str.split('-').map(n => +n);
  return Math.floor(Date.UTC(y, m-1, d) / 86400000);
}
function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const xs = arr.slice().sort((a,b)=>a-b);
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}
function ensureBestsShape(b) {
  return b && typeof b === 'object' ? b : { 
    global: { bestScore:0, bestAvgRt:null, bestAccuracy:null, bestHpm:null, bestStreak:0, longestSessionSec:0 },
    byMode: {}
  };
}
function ensurePlaytimeShape(p) {
  return p && typeof p === 'object' ? p : { byDay:{}, lastPlayedDate:null, dayStreak:0 };
}
function updateBests(bests, modeKey, run) {
  const tgtGlobal = bests.global;
  const tgtMode = bests.byMode[modeKey] ?? (bests.byMode[modeKey] = {
    bestScore:0, bestAvgRt:null, bestAccuracy:null, bestHpm:null, bestStreak:0, longestSessionSec:0
  });

  const apply = (obj) => {
    if (run.score         > (obj.bestScore ?? 0))                  obj.bestScore = run.score;
    if (obj.bestAvgRt == null || (run.avgRt > 0 && run.avgRt < obj.bestAvgRt)) obj.bestAvgRt = run.avgRt;
    if (obj.bestAccuracy == null || run.accuracy > obj.bestAccuracy)           obj.bestAccuracy = run.accuracy;
    if (obj.bestHpm == null || run.hpm > obj.bestHpm)                            obj.bestHpm = run.hpm;
    if (run.bestStreak    > (obj.bestStreak ?? 0))                 obj.bestStreak = run.bestStreak;
    if (run.durationSec   > (obj.longestSessionSec ?? 0))          obj.longestSessionSec = run.durationSec;
  };

  apply(tgtGlobal);
  apply(tgtMode);
}
function updatePlaytime(play, run) {
  const day = ymdLocal(new Date(run.tsEnd));
  const rec = play.byDay[day] ?? (play.byDay[day] = { seconds:0, runs:0, hits:0, misses:0 });
  rec.seconds += run.durationSec;
  rec.runs    += 1;
  rec.hits    += run.score;
  rec.misses  += run.misses;

  if (!play.lastPlayedDate) {
    play.lastPlayedDate = day;
    play.dayStreak = 1;
  } else {
    const prev = play.lastPlayedDate;
    const diff = dayNumber(day) - dayNumber(prev);
    if (diff === 0) {
      // gleicher Tag: Streak unverändert
    } else if (diff === 1) {
      play.dayStreak = (play.dayStreak || 0) + 1;
      play.lastPlayedDate = day;
    } else {
      play.dayStreak = 1;
      play.lastPlayedDate = day;
    }
  }
}

// ---------- Session-State ----------
let __session = null;

/**
 * Start einer neuen Session.
 * meta: { modeGroup: "grid"|"visual"|"audio"|"training", modeId: "grid-easy", difficulty: "easy"|... }
 */
export function beginSession(meta) {
  __session = {
    tsStart: Date.now(),
    modeGroup: meta?.modeGroup ?? null,
    modeId: meta?.modeId ?? null,
    difficulty: meta?.difficulty ?? null
  };
}

/**
 * Abschluss & Persistenz eines Runs.
 * params: { score, misses, bestStreak, playerName?, reactionTimes?, durationSec? }
 * Gibt den gespeicherten Run zurück.
 */
export function finalizeRunAndPersist(params) {
  const now = Date.now();
  const score       = Math.max(0, +params.score || 0);
  const misses      = Math.max(0, +params.misses || 0);
  const bestStreak  = Math.max(0, +params.bestStreak || 0);
  const rts         = Array.isArray(params.reactionTimes) ? params.reactionTimes.filter(n => n >= 0 && isFinite(n)) : [];
  const attempts    = score + misses;
  const accuracy    = attempts ? score / attempts : 0;
  const avgRt       = rts.length ? (rts.reduce((a,b)=>a+b,0) / rts.length) : 0;
  const medRt       = median(rts);
  const tsStart     = __session?.tsStart ?? (now - ((params.durationSec || 30) * 1000));
  const durationSec = Math.max(1, Math.round((params.durationSec ?? ((now - tsStart)/1000))));
  const hpm         = durationSec ? (score / (durationSec/60)) : 0;

  const modeGroup   = __session?.modeGroup ?? null;
  const modeId      = __session?.modeId ?? null;
  const difficulty  = __session?.difficulty ?? null;
  const player      = (params.playerName ?? '').toString();

  const run = {
    id: new Date(tsStart).toISOString() + '_' + (modeId || 'unknown'),
    tsStart,
    tsEnd: now,
    modeGroup,
    modeId,
    difficulty,
    playerName: player,
    score,
    misses,
    attempts,
    accuracy,        // 0..1
    durationSec,
    avgRt,           // Sekunden
    medRt,           // Sekunden
    bestStreak,
    hpm,             // Hits/Minute
    extras: params.extras || null
  };

  // Runs-List aktualisieren (mit Limit)
  const runsWrap = readJson(RUNS_KEY, { runs: [] });
  runsWrap.runs.push(run);
  // optional begrenzen: die letzten 500 behalten
  if (runsWrap.runs.length > 500) runsWrap.runs = runsWrap.runs.slice(-500);
  writeJson(RUNS_KEY, runsWrap);

  // Bestwerte aktualisieren
  const bests = ensureBestsShape(readJson(BESTS_KEY, null));
  const modeKey = modeId || (modeGroup || 'unknown');
  updateBests(bests, modeKey, run);
  writeJson(BESTS_KEY, bests);

  // Spielzeit aggregieren
  const play = ensurePlaytimeShape(readJson(PLAYTIME_KEY, null));
  updatePlaytime(play, run);
  writeJson(PLAYTIME_KEY, play);

  // Session schließen
  __session = null;
  return run;
}

// ---------- (optional) Loader-Utils für dein Stats-Panel ----------
export function loadRuns()     { return readJson(RUNS_KEY, { runs: [] }); }
export function loadBests()    { return ensureBestsShape(readJson(BESTS_KEY, null)); }
export function loadPlaytime() { return ensurePlaytimeShape(readJson(PLAYTIME_KEY, null)); }
