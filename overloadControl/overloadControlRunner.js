// overloadControlRunner.js

import {
  startOverloadControl,
  registerClick,
  registerNoClick,
  setShouldClick
} from "./overloadControlCore.js";

import { placeFooterBackButton } from "../uiCommon.js";

const HARD_COLORS = [
  "#2ecc71", // grün
  "#e74c3c", // rot
  "#3498db", // blau
  "#f1c40f", // gelb
  "#9b59b6"  // lila
];

function isFarEnough(x, y, placed, minDist) {
  return placed.every(p => {
    const dx = p.x - x;
    const dy = p.y - y;
    return Math.sqrt(dx * dx + dy * dy) >= minDist;
  });
}

let runner = {
  spawnMs: 2000,
  activeTimer: null,
  clickWindowOpen: false,
  ruleFn: null,
  playfield: null,
  diffKey: "easy",

  // Hard-spezifisch
  hardHasValidTarget: false,
  hardClicked: false,

  // Hard 2.0: Regelwechsel
  hardRule: "A",                // "A" oder "B"
  hardRuleSwitchMs: 10_000,
  hardRuleNextSwitchAt: 0,
  hardBadgeEl: null
};

function ensureHardBadge() {
  if (!runner.playfield) return null;

  let badge = runner.playfield.querySelector("#overload-hard-rule");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "overload-hard-rule";

    // ✅ Mitte des Spielfelds
    badge.style.position = "absolute";
    badge.style.left = "50%";
    badge.style.top = "50%";
    badge.style.transform = "translate(-50%, -50%)";

    // ✅ gut sichtbar
    badge.style.padding = "10px 16px";
    badge.style.borderRadius = "16px";
    badge.style.fontSize = "18px";
    badge.style.fontWeight = "800";
    badge.style.letterSpacing = "0.4px";
    badge.style.textAlign = "center";
    badge.style.lineHeight = "1.15";

    // ✅ Overlay Look
    badge.style.background = "rgba(0,0,0,0.55)";
    badge.style.border = "1px solid rgba(255,255,255,0.22)";
    badge.style.backdropFilter = "blur(2px)";
    badge.style.userSelect = "none";
    badge.style.pointerEvents = "none";
    badge.style.zIndex = "60";
    badge.style.textShadow = "0 2px 10px rgba(0,0,0,0.55)";

    runner.playfield.appendChild(badge);
  }

  runner.hardBadgeEl = badge;
  return badge;
}


function hardRuleHTML(rule) {
  const highlight = (word) =>
    `<span style="
      font-weight:900;
      letter-spacing:1px;
      text-transform:uppercase;
      color:#ffffff;
    ">${word}</span>`;

  return rule === "A"
    ? `GRÜN ${highlight("RUHIG")}`
    : `GRÜN ${highlight("PULS")}`;
}



function maybeSwitchHardRule() {
  if (runner.diffKey !== "hard") return;

  const t = performance.now();
  if (t >= runner.hardRuleNextSwitchAt) {
    runner.hardRule = runner.hardRule === "A" ? "B" : "A";
    runner.hardRuleNextSwitchAt = t + runner.hardRuleSwitchMs;

    const badge = ensureHardBadge();
    if (badge) badge.innerHTML = hardRuleHTML(runner.hardRule);
  }
}

/*
  Startpunkt
*/
export function startRunner(config) {
  runner.spawnMs = config.spawnMs;
  runner.ruleFn = config.ruleFn;
  runner.diffKey = config.diffKey || "easy";
  runner.playfield = document.getElementById("overload-playfield");

  if (!runner.playfield) {
    console.error("[OverloadRunner] playfield fehlt");
    return;
  }

  runner.playfield.innerHTML = "";
  bindUI();

  // In-Game „Zurück zum Menü“
  placeFooterBackButton("overload", () => {
    clearTimeout(runner.activeTimer);
    runner.clickWindowOpen = false;
  });

  // Hard 2.0 Setup
  if (runner.diffKey === "hard") {
    runner.hardRule = config.hardRuleStart === "B" ? "B" : "A";
    runner.hardRuleSwitchMs = Number(config.hardRuleSwitchMs) || 10_000;
    runner.hardRuleNextSwitchAt = performance.now() + runner.hardRuleSwitchMs;

    const badge = ensureHardBadge();
    if (badge) badge.innerHTML = hardRuleHTML(runner.hardRule);
  }

  startOverloadControl(config);

  runner.clickWindowOpen = false;
  nextCycle();
}

/*
  Klick-Bindung (nur Easy / Medium)
*/
function bindUI() {
  runner.playfield.onclick = () => {
    if (!runner.clickWindowOpen) return;
    if (runner.diffKey === "hard") return;

    runner.clickWindowOpen = false;
    const ok = registerClick();
    flashPlayfield(ok);
  };
}

/*
  Entscheidungs-Zyklus
*/
function nextCycle() {
  clearTimeout(runner.activeTimer);

  // EASY / MEDIUM: Auswertung für "nicht geklickt"
  if (runner.clickWindowOpen && runner.diffKey !== "hard") {
    runner.clickWindowOpen = false;
    const ok = registerNoClick();
    if (!ok) flashPlayfield(false);
  }

  // HARD: Auswertung für "nicht geklickt"
  if (runner.diffKey === "hard" && runner.clickWindowOpen) {
    runner.clickWindowOpen = false;

    if (!runner.hardClicked) {
      const ok = registerNoClick();
      if (!ok) flashPlayfield(false);
    }
  }

  // Hard 2.0: ggf. Regel wechseln
  maybeSwitchHardRule();

  // Regel nur für Easy / Medium
  if (runner.diffKey !== "hard") {
    const shouldClick = !!runner.ruleFn();
    setShouldClick(shouldClick);
  }

  spawnStimulus();

  runner.clickWindowOpen = true;
  runner.hardClicked = false;

  runner.activeTimer = setTimeout(nextCycle, runner.spawnMs);
}

/*
  Stimulus-Auswahl
*/
function spawnStimulus() {
  // Badge behalten (Hard)
  const badge = runner.diffKey === "hard" ? ensureHardBadge() : null;

  runner.playfield.innerHTML = "";

  if (runner.diffKey === "hard" && badge) {
    runner.playfield.appendChild(badge);
  }

  if (runner.diffKey === "easy") {
    spawnSingle(false);
  } else if (runner.diffKey === "medium") {
    spawnSingle(true);
  } else if (runner.diffKey === "hard") {
    spawnHard();
  }
}

/*
  Single-Kreis (Easy / Medium)
*/
function spawnSingle(allowFake) {
  const shouldClick = !!runner.ruleFn();
  setShouldClick(shouldClick);

  const el = document.createElement("div");
  el.className = "overload-stimulus";
  el.style.width = "80px";
  el.style.height = "80px";
  el.style.borderRadius = "50%";
  el.style.position = "absolute";

  const maxX = runner.playfield.clientWidth - 80;
  const maxY = runner.playfield.clientHeight - 80;
  el.style.left = Math.random() * maxX + "px";
  el.style.top = Math.random() * maxY + "px";

  if (allowFake) {
    el.style.background = "#2ecc71";
    if (!shouldClick) el.classList.add("pulse");
  } else {
    el.style.background = shouldClick ? "#2ecc71" : "#e74c3c";
  }

  runner.playfield.appendChild(el);
}

/*
  HARD – Hard 2.0 (Regelwechsel A/B)
*/
function spawnHard() {
  const size = 80;
  const minDist = size + 12;
  const placed = [];

  runner.hardHasValidTarget = false;

  // Du kannst hier auf 4 erhöhen, wenn du noch mehr Chaos willst:
  const PICK = 3;

  const colors = HARD_COLORS
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, PICK);

  // Puls-Flags zufällig verteilen
  const pulseFlags = Array(PICK).fill(false);
  const pulseCount = Math.floor(Math.random() * (PICK + 1)); // 0..PICK
  for (let i = 0; i < pulseCount; i++) pulseFlags[i] = true;
  pulseFlags.sort(() => Math.random() - 0.5);

  colors.forEach((color, i) => {
    let x, y, tries = 0;
    do {
      x = Math.random() * (runner.playfield.clientWidth - size);
      y = Math.random() * (runner.playfield.clientHeight - size);
      tries++;
    } while (!isFarEnough(x, y, placed, minDist) && tries < 50);

    placed.push({ x, y });

    const el = document.createElement("div");
    el.className = "overload-stimulus";
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.borderRadius = "50%";
    el.style.position = "absolute";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.background = color;

    const isGreen = color === "#2ecc71";
    const isPulsing = pulseFlags[i];
    if (isPulsing) el.classList.add("pulse");

    // Hard 2.0 Regel:
    // A: grün + NICHT pulsierend
    // B: grün + pulsierend
    const isCorrect =
      runner.hardRule === "A"
        ? (isGreen && !isPulsing)
        : (isGreen && isPulsing);

    if (isCorrect) runner.hardHasValidTarget = true;

    el.onclick = () => {
      if (!runner.clickWindowOpen) return;

      runner.clickWindowOpen = false;
      runner.hardClicked = true;

      setShouldClick(isCorrect);
      const ok = registerClick();
      flashPlayfield(ok);
    };

    runner.playfield.appendChild(el);
  });

  // Erwartung für diesen Zyklus setzen:
  // Wenn es ein korrektes Ziel gibt → sollte klicken,
  // sonst → sollte NICHT klicken.
  setShouldClick(runner.hardHasValidTarget);
}

/*
  Feedback
*/
function flashPlayfield(success) {
  runner.playfield.style.boxShadow =
    success
      ? "0 0 22px rgba(46,204,113,0.8)"
      : "0 0 22px rgba(231,76,60,0.8)";

  setTimeout(() => {
    runner.playfield.style.boxShadow = "";
  }, 120);
}
