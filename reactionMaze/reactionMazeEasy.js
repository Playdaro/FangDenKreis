// reactionMazeEasy.js
import { startMaze } from "./reactionMazeCore.js";

export function startMazeEasy() {
  startMaze({
    label: "Easy",

    cols: 4,
    rows: 4,
    pathLen: 8,

    // 🔑 Neues Regelwerk
    totalMs: 30000,       // 30 Sekunden Gesamtzeit
    requiredHits: 40      // 40 richtige Treffer zum Gewinnen
  });
}
