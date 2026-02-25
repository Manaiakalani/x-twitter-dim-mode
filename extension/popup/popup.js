/*
 * X (Twitter) Dim Mode — Popup Script
 *
 * Toggles the enabled state via browser.storage.local.
 * The content script listens for storage changes so no
 * tabs permission or direct messaging is needed.
 */

(function () {
  "use strict";

  const toggle = document.getElementById("toggleSwitch");
  const label = document.getElementById("statusLabel");

  function updateLabel(enabled) {
    label.textContent = enabled ? "Enabled" : "Disabled";
  }

  // Initialise toggle state from storage.
  browser.storage.local.get({ enabled: true }).then((result) => {
    toggle.checked = result.enabled;
    updateLabel(result.enabled);
  });

  // Handle toggle changes — just write to storage;
  // the content script picks it up via storage.onChanged.
  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    updateLabel(enabled);
    browser.storage.local.set({ enabled });
  });
})();
