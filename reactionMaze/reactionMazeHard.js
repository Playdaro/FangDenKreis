// reactionMazeHard.js
import { startMaze } from "./reactionMazeCore.js";

export function startMazeHard() {
  startMaze({
    label: "Schwer",

    cols: 6,
    rows: 6,
    pathLen: 16,

    // 🔑 Neues Regelwerk
    totalMs: 30000,       // 30 Sekunden Gesamtzeit
    requiredHits: 60      // 60 richtige Treffer zum Gewinnen
  });
}
