// uiCommon.js
import { showScreen } from '../screens.js';

let injected = false;
function injectStyles() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.id = 'ui-common-footer-style';
  s.textContent = `
    .mode-footer { width:100%; display:flex; justify-content:center; margin-top:20px; }
    .mode-footer .btn-back { min-width:220px; padding:10px 16px; border-radius:10px; color:#fff; }
  `;
  document.head.appendChild(s);
}

/**
 * Fügt unter dem Haupt-Spielbereich eines Screens einen mittigen "Zurück zum Menü"-Button ein.
 * - screenId: ohne "screen-" Präfix (z.B. "visual")
 * - onBack: Callback (z.B. Stop-Funktion), danach ggf. showScreen('menu')
 */
export function placeFooterBackButton(screenId, onBack) {
  injectStyles();
  const screen = document.getElementById(`screen-${screenId}`);
  if (!screen) return;

  let footer = screen.querySelector('.mode-footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'mode-footer';
    screen.appendChild(footer);
  }

  let btn = footer.querySelector('#btn-back-menu');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-back-menu';
    btn.className = 'btn-back';
    btn.type = 'button';
    btn.textContent = 'Zurück zum Menü';
    footer.appendChild(btn);
  }

  btn.onclick = () => {
    try { onBack?.(); } catch {}
    showScreen('menu');
  };
}
