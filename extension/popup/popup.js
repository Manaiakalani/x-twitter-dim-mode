/*
 * X (Twitter) Dim Mode — Popup Script
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

  // Handle toggle changes.
  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    updateLabel(enabled);
    browser.storage.local.set({ enabled });

    // Notify all matching tabs so the change takes effect immediately.
    browser.tabs.query({ url: ["*://x.com/*", "*://twitter.com/*"] }).then((tabs) => {
      for (const tab of tabs) {
        browser.tabs.sendMessage(tab.id, { enabled }).catch(() => {
          // Tab may not have the content script yet — safe to ignore.
        });
      }
    });
  });
})();
