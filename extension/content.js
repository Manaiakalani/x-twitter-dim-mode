/*
 * X (Twitter) Dim Mode — Content Script
 *
 * Swaps the body background-color from Twitter's "Lights out" black
 * (#000000) or light (#FFFFFF) to the classic dim blue (#15202B).
 *
 * Twitter/X reads the body background colour and derives text,
 * border, and surface colours from it automatically, so a single
 * targeted swap is enough — no need to override individual elements.
 */

(function () {
  "use strict";

  const CLASS_NAME = "xt-dim-mode";
  const DIM_BG = "#15202B";

  // Colours Twitter sets on body that we want to replace.
  const REPLACE_TARGETS = new Set([
    "rgb(0, 0, 0)",       // Lights-out (pure black)
    "rgb(255, 255, 255)", // Default light theme
    "#000000",
    "#000",
    "#ffffff",
    "#fff",
  ]);

  function setBodyBg() {
    if (!document.body) return;
    const current = document.body.style.backgroundColor;
    if (current && !current.includes("21, 32, 43")) {
      // Only override if it's not already dim-ish
      document.body.style.backgroundColor = DIM_BG;
    } else if (!current) {
      document.body.style.backgroundColor = DIM_BG;
    }
  }

  function applyDimMode(enabled) {
    if (enabled) {
      document.documentElement.classList.add(CLASS_NAME);
      setBodyBg();
    } else {
      document.documentElement.classList.remove(CLASS_NAME);
      // Let Twitter re-apply its own background on next render.
    }
  }

  // Watch only <body style="..."> changes so we can re-apply if
  // Twitter's JS resets the background colour.
  function startObserver() {
    const observer = new MutationObserver(() => {
      if (!document.documentElement.classList.contains(CLASS_NAME)) return;
      const bg = document.body.style.backgroundColor;
      if (bg && REPLACE_TARGETS.has(bg)) {
        document.body.style.backgroundColor = DIM_BG;
      }
    });

    const observe = () => {
      if (document.body) {
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ["style"],
        });
      }
    };

    if (document.body) {
      observe();
    } else {
      document.addEventListener("DOMContentLoaded", observe);
    }
  }

  // Read persisted state and apply.
  browser.storage.local.get({ enabled: true }).then((result) => {
    applyDimMode(result.enabled);
    if (result.enabled) startObserver();
  });

  // Listen for toggle messages from the popup.
  browser.runtime.onMessage.addListener((message) => {
    if (typeof message.enabled === "boolean") {
      applyDimMode(message.enabled);
      if (message.enabled) startObserver();
    }
  });
})();
