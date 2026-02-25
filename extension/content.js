/*
 * X (Twitter) Dim Mode — Content Script
 *
 * Reads the enabled state from extension storage and toggles the
 * `xt-dim-mode` class on <html>.  Also listens for runtime messages
 * from the popup so changes take effect immediately.
 */

(function () {
  "use strict";

  const CLASS_NAME = "xt-dim-mode";

  function applyDimMode(enabled) {
    if (enabled) {
      document.documentElement.classList.add(CLASS_NAME);
    } else {
      document.documentElement.classList.remove(CLASS_NAME);
    }
  }

  // Observe inline-style background mutations on the body so we can
  // continuously override Twitter's dynamic theme changes.
  function observeBodyStyle() {
    const observer = new MutationObserver(() => {
      if (!document.documentElement.classList.contains(CLASS_NAME)) return;
      const bg = document.body.style.backgroundColor;
      if (bg && bg !== "rgb(21, 32, 43)") {
        document.body.style.backgroundColor = "#15202B";
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["style"],
      });
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        if (document.body) {
          observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["style"],
          });
        }
      });
    }
  }

  // Read persisted state and apply.
  browser.storage.local.get({ enabled: true }).then((result) => {
    applyDimMode(result.enabled);
    observeBodyStyle();
  });

  // Listen for toggle messages from the popup / background script.
  browser.runtime.onMessage.addListener((message) => {
    if (typeof message.enabled === "boolean") {
      applyDimMode(message.enabled);
    }
  });
})();
