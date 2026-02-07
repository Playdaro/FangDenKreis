// overloadControlResult.js
import { bindResultButtons } from "../result.js";
import { showScreen } from "../screens.js";

import { startEasy } from "./overloadControlEasy.js";
import { startMedium } from "./overloadControlMedium.js";
import { startHard } from "./overloadControlHard.js";

function bindOverloadResultOnce() {
  bindResultButtons({
    menuBtnId: "overload-res-menu",
    retryBtnId: "overload-res-retry",
    onRetry: () => {
      const diff = window.lastOverloadDifficulty || "easy";
      showScreen("overload");

      if (diff === "easy") startEasy();
      else if (diff === "medium") startMedium();
      else startHard();
    },
    menuKey: "menu",
  });
}

document.addEventListener("DOMContentLoaded", bindOverloadResultOnce);
