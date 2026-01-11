// reactionMazeMedium.js
import { startMaze } from "./reactionMazeCore.js";

export function startMazeMedium() {
  startMaze({
    label: "Medium",

    cols: 5,
    rows: 5,
    pathLen: 12,

    // 🔑 Neues Regelwerk
    totalMs: 30000,       // 30 Sekunden Gesamtzeit
    requiredHits: 50      // 50 richtige Treffer zum Gewinnen
  });
}
