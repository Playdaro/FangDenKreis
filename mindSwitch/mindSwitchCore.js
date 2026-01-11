// mindSwitchCore.js
// Zentrale Engine für alle Mind Switch Modi (Easy / Medium / Hard)
//
// - keine direkten DOM-Zugriffe
// - UI läuft komplett über Callbacks
// - Runner kümmert sich um Buttons, Screen-Wechsel usw.

export class MindSwitchCore {
  /**
   * @param {Object} config
   * @param {string} config.modeLabel    - Anzeigename des Modus (z.B. "Easy", "Medium", "Hard")
   * @param {number} config.durationMs   - Gesamtdauer des Runs in Millisekunden (z.B. 30000)
   * @param {number} config.stepTimeoutMs - optional: max. Zeit pro Aufgabe; 0 = kein Step-Timeout
   * @param {function(): Object} config.generatePrompt
   *        → Soll ein Objekt liefern:
   *        {
   *          promptText: string,      // z.B. "LINKS", "ROT", "Farbe folgen" usw.
   *          cueType: "text"|"color"|"mixed"|"custom", // nur Info für UI
   *          correctSide: "left"|"right"               // richtige Seite
   *        }
   *
   * @param {function(Object):void} config.onPrompt
   *        → wird bei jeder neuen Aufgabe aufgerufen.
   *        erhält dasselbe Objekt wie generatePrompt() + stepIndex
   *
   * @param {function(Object):void} config.onUpdateHUD
   *        → UI-Update (Score, Zeit, Fehler etc.)
   *        erhält:
   *        {
   *          remainingMs,
   *          score,
   *          misses,
   *          steps,
   *          bestStreak,
   *          currentStreak
   *        }
   *
   * @param {function(Object):void} config.onEnd
   *        → wird bei Run-Ende aufgerufen mit:
   *        {
   *          modeLabel,
   *          totalTimeMs,
   *          steps,
   *          hits,
   *          misses,
   *          bestStreak,
   *          avgReactionMs,
   *          accuracy,         // 0..1
   *          endReason         // "time", "manual", "step-timeout", "config"
   *        }
   */
  constructor(config) {
    this.modeLabel      = config.modeLabel || "Mind Switch";
    this.durationMs     = config.durationMs ?? 30000;
    this.stepTimeoutMs  = config.stepTimeoutMs ?? 0;

    this.generatePrompt = config.generatePrompt;
    this.onPrompt       = config.onPrompt || (() => {});
    this.onUpdateHUD    = config.onUpdateHUD || (() => {});
    this.onEnd          = config.onEnd || (() => {});

    if (typeof this.generatePrompt !== "function") {
      throw new Error("[MindSwitchCore] config.generatePrompt muss eine Funktion sein.");
    }

    // Laufzeit-Status
    this._running       = false;
    this._startTime     = 0;
    this._endTime       = 0;
    this._timerId       = null;
    this._stepTimerId   = null;

    this._currentStepIndex   = 0;
    this._currentPrompt      = null;
    this._currentStepStart   = 0;
    this._currentStepDone    = false; // schützt vor Doppelklicks

    this._score         = 0;
    this._misses        = 0;
    this._hits          = 0;
    this._reactionTimes = [];
    this._bestStreak    = 0;
    this._currentStreak = 0;

    // Für Debug
    // window.__mindSwitchCore = this;
  }

  /**
   * Startet einen neuen Run.
   */
  start() {
    if (this._running) {
      // laufender Run → zuerst stoppen
      this.stop("config");
    }

    this._running       = true;
    this._startTime     = performance.now();
    this._endTime       = this._startTime + this.durationMs;
    this._currentStepIndex = 0;
    this._currentPrompt    = null;
    this._currentStepDone  = false;
    this._score         = 0;
    this._misses        = 0;
    this._hits          = 0;
    this._reactionTimes = [];
    this._bestStreak    = 0;
    this._currentStreak = 0;

    // Globaler Timer
    this._tick(); // initiales HUD-Update
    this._scheduleNextPrompt();

    this._timerId = requestAnimationFrame(this._loop.bind(this));
  }

  /**
   * Interne Game-Loop für globalen Timer.
   */
  _loop(now) {
    if (!this._running) return;

    const remaining = this._endTime - now;
    if (remaining <= 0) {
      // Zeit abgelaufen
      this._updateHUD(0);
      this._finish("time");
      return;
    }

    this._updateHUD(remaining);

    this._timerId = requestAnimationFrame(this._loop.bind(this));
  }

  /**
   * Aktualisiert HUD via Callback.
   */
  _updateHUD(remainingMsOverride = null) {
    const now = performance.now();
    const remaining = remainingMsOverride !== null
      ? remainingMsOverride
      : Math.max(0, this._endTime - now);

    this.onUpdateHUD({
      remainingMs: remaining,
      score: this._score,
      misses: this._misses,
      steps: this._currentStepIndex,
      bestStreak: this._bestStreak,
      currentStreak: this._currentStreak
    });
  }

  /**
   * Plant die nächste Aufgabe (Prompt).
   */
  _scheduleNextPrompt(fromTimeout = false) {
    if (!this._running) return;

    // falls es einen Step-Timeout gibt und der letzte Schritt nicht beantwortet wurde,
    // werten wir das als Fehler (nur, wenn es nicht der allererste Schritt war)
    if (fromTimeout && !this._currentStepDone && this._currentStepIndex > 0) {
      this._registerMiss("step-timeout");
    }

    this._currentStepIndex += 1;
    this._currentStepDone  = false;

    // Neues Prompt holen
    const prompt = this.generatePrompt();
    if (!prompt || (prompt.correctSide !== "left" && prompt.correctSide !== "right")) {
      console.warn("[MindSwitchCore] Ungültiges Prompt von generatePrompt()", prompt);
      return;
    }
    this._currentPrompt    = prompt;
    this._currentStepStart = performance.now();

    this.onPrompt({
      ...prompt,
      stepIndex: this._currentStepIndex
    });

    // Step-Timeout-Timer (optional)
    if (this.stepTimeoutMs > 0) {
      if (this._stepTimerId != null) {
        clearTimeout(this._stepTimerId);
      }
      this._stepTimerId = setTimeout(() => {
        this._scheduleNextPrompt(true);
      }, this.stepTimeoutMs);
    }
  }

  /**
   * Soll vom Runner aufgerufen werden, wenn Spieler klickt.
   * @param {"left"|"right"} side
   */
  handleClick(side) {
    if (!this._running || !this._currentPrompt) return;
    if (this._currentStepDone) return; // Klick nach Abschluss ignorieren

    this._currentStepDone = true;

    // Step-Timeout stoppen
    if (this._stepTimerId != null) {
      clearTimeout(this._stepTimerId);
      this._stepTimerId = null;
    }

    const now = performance.now();
    const rt  = now - this._currentStepStart;
    this._reactionTimes.push(rt);

    const correct = (side === this._currentPrompt.correctSide);
    if (correct) {
      this._hits += 1;
      this._score += 1;
      this._currentStreak += 1;
      if (this._currentStreak > this._bestStreak) {
        this._bestStreak = this._currentStreak;
      }
    } else {
      this._registerMiss("wrong-click");
    }

    // Nächste Aufgabe
    this._scheduleNextPrompt(false);
  }

  /**
   * Zählt Miss + Streak-Reset.
   */
  _registerMiss(reason) {
    this._misses += 1;
    this._currentStreak = 0;
    // reason aktuell nur info – könnte später genutzt werden
  }

  /**
   * Stoppt das Spiel (z.B. Back-Button).
   */
  stop(reason = "manual") {
    if (!this._running) return;
    this._finish(reason);
  }

  /**
   * Gemeinsamer Abschluss.
   */
  _finish(endReason) {
    if (!this._running) return;
    this._running = false;

    if (this._timerId != null) {
      cancelAnimationFrame(this._timerId);
      this._timerId = null;
    }
    if (this._stepTimerId != null) {
      clearTimeout(this._stepTimerId);
      this._stepTimerId = null;
    }

    const now = performance.now();
    const totalTimeMs = now - this._startTime;

    let avgReactionMs = 0;
    if (this._reactionTimes.length > 0) {
      const sum = this._reactionTimes.reduce((a, b) => a + b, 0);
      avgReactionMs = Math.round(sum / this._reactionTimes.length);
    }

    const totalAttempts = this._hits + this._misses;
    const accuracy = totalAttempts > 0 ? this._hits / totalAttempts : 0;

    const result = {
      modeLabel: this.modeLabel,
      totalTimeMs,
      steps: this._currentStepIndex,
      hits: this._hits,
      misses: this._misses,
      bestStreak: this._bestStreak,
      avgReactionMs,
      accuracy,
      endReason
    };

    this.onEnd(result);
  }
}
