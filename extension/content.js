/*
 * X (Twitter) Dim Mode — Content Script  (Safari Web Extension)
 *
 * Layers the classic dim (dark-blue) palette on top of X's Lights Out
 * theme.  Uses a combination of:
 *   - CSS class gating  (html.xt-dim-mode)
 *   - X's own CSS variable overrides  (body.LightsOut)
 *   - A background scanner that marks dynamically-added black elements
 *   - A "Dim" radio button injected into Display → Background settings
 *   - A MutationObserver that watches body.LightsOut to stay in sync
 */

(function () {
  "use strict";

  const DIM_CLASS   = "xt-dim-mode";
  const DIM_BTN_ID  = "xt-dim-option";
  const PATCH_CLS   = "dim-patched";
  const PATCH_EL_CLS = "dim-patched-elevated";

  let _enabled = false;
  let _seenLightsOut = false;
  let _suspendedForLight = false;
  let _domObserver = null;
  let _bodyObserver = null;
  let _scanFrame = 0;
  const _scanQueue = new Set();

  // ── Helpers ──────────────────────────────────────────────────────

  function isDimActive() {
    return document.documentElement.classList.contains(DIM_CLASS);
  }

  // ── Apply / Remove ──────────────────────────────────────────────

  function applyDim() {
    document.documentElement.classList.add(DIM_CLASS);
    if (document.body) scheduleScan([document.body]);
  }

  function removeDim() {
    document.documentElement.classList.remove(DIM_CLASS);
    cancelScan();
    for (const el of document.querySelectorAll("." + PATCH_CLS + ", ." + PATCH_EL_CLS)) {
      el.classList.remove(PATCH_CLS, PATCH_EL_CLS);
    }
  }

  // ── Background Scanner ──────────────────────────────────────────
  //
  // X applies inline background-color on many elements dynamically.
  // The CSS handles the most common patterns via [style*=...] but
  // newly-inserted nodes can slip through.  The scanner picks up
  // anything the CSS missed by adding a lightweight class that the
  // stylesheet targets.

  function scheduleScan(nodes) {
    for (const n of nodes) {
      if (n && n.nodeType === 1) _scanQueue.add(n);
    }
    if (_scanQueue.size && !_scanFrame) {
      _scanFrame = requestAnimationFrame(flushScan);
    }
  }

  function cancelScan() {
    if (_scanFrame) {
      cancelAnimationFrame(_scanFrame);
      _scanFrame = 0;
    }
    _scanQueue.clear();
  }

  function flushScan() {
    _scanFrame = 0;
    if (!isDimActive()) { _scanQueue.clear(); return; }
    const batch = [..._scanQueue];
    _scanQueue.clear();
    for (const root of batch) scanSubtree(root);
  }

  function scanSubtree(root) {
    patchElement(root);
    const elems = root.querySelectorAll(
      "div,main,aside,header,nav,section,article,footer,button"
    );
    for (const el of elems) patchElement(el);
  }

  function patchElement(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.classList.contains(PATCH_CLS) || el.classList.contains(PATCH_EL_CLS)) return;
    const bg = el.style.backgroundColor;
    if (bg === "rgb(0, 0, 0)" || bg === "rgba(0, 0, 0, 1)") {
      el.classList.add(PATCH_CLS);
    } else if (bg === "rgb(24, 24, 27)") {
      el.classList.add(PATCH_EL_CLS);
    }
  }

  function fullRescan() {
    if (_enabled && document.body) scheduleScan([document.body]);
  }

  // ── Body class observer (LightsOut sync) ────────────────────────
  //
  // X adds body.LightsOut when the user (or system) picks dark mode.
  // We activate dim only when LightsOut is present, and suspend it
  // when the user switches to default/light.

  function syncWithTheme() {
    if (!_enabled || !document.body) return;
    const hasLightsOut = document.body.classList.contains("LightsOut");

    if (hasLightsOut) {
      _suspendedForLight = false;
      applyDim();
      if (!isDimActive()) {
        // Schedule re-scans as X hydrates
        for (const ms of [500, 1500, 3000, 5000]) setTimeout(fullRescan, ms);
      }
    } else if (isDimActive() && _seenLightsOut) {
      // Switched to light mode — suspend dim
      _suspendedForLight = true;
      removeDim();
    }
  }

  function startBodyObserver() {
    if (_bodyObserver || !document.body) return;
    if (document.body.classList.contains("LightsOut")) _seenLightsOut = true;
    _bodyObserver = new MutationObserver(() => {
      if (document.body.classList.contains("LightsOut")) _seenLightsOut = true;
      syncWithTheme();
    });
    _bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  function stopBodyObserver() {
    if (_bodyObserver) { _bodyObserver.disconnect(); _bodyObserver = null; }
  }

  // ── DOM observer (new-node scanning + settings injection) ───────

  function startDomObserver() {
    if (_domObserver) return;
    _domObserver = new MutationObserver((mutations) => {
      try {
        // Re-apply dim if X's JS removed the class
        if (_enabled && !_suspendedForLight && !isDimActive()) {
          applyDim();
        }
        // Scan newly added nodes
        if (_enabled && isDimActive()) {
          for (const m of mutations) {
            if (m.addedNodes.length) scheduleScan(m.addedNodes);
          }
        }
        // Inject dim button if Display settings page opened
        tryInjectDimButton();
        // Start body observer once body exists
        if (_enabled && document.body && !_bodyObserver) {
          startBodyObserver();
        }
      } catch {
        // Extension context invalidated (e.g. after reload)
        _domObserver.disconnect();
      }
    });
    _domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // ── Display Settings injection ──────────────────────────────────
  //
  // Injects a "Dim" radio button into Settings → Display → Background
  // so the user can switch themes natively inside X's UI.

  const CHECKMARK_PATH = "M9.64 18.952l-5.55-4.861 1.317-1.504 3.951 3.459 8.459-10.948L19.4 6.32 9.64 18.952z";

  function tryInjectDimButton() {
    if (document.getElementById(DIM_BTN_ID)) return;

    // Locate the background radio group (language-independent)
    const bgRadio = document.querySelector('input[name="background-picker"]');
    if (!bgRadio) return;
    const radiogroup = bgRadio.closest('[role="radiogroup"]');
    if (!radiogroup) return;

    const buttons = radiogroup.querySelectorAll(":scope > div");
    if (buttons.length < 2) return;

    const defaultBtn  = buttons[0];
    const lightsOutBtn = buttons[1];

    // Clone Lights Out as the base for our Dim button
    const dimBtn = lightsOutBtn.cloneNode(true);
    dimBtn.id = DIM_BTN_ID;
    dimBtn.style.backgroundColor = "hsl(210, 34%, 13%)";

    // Update label
    const label = dimBtn.querySelector("span");
    if (label) label.textContent = "Dim";

    // Update radio input
    const input = dimBtn.querySelector('input[type="radio"]');
    if (input) {
      input.setAttribute("aria-label", "Dim");
      input.checked = false;
    }

    // Insert between Default and Lights Out
    radiogroup.insertBefore(dimBtn, lightsOutBtn);

    // Set initial selection state
    browser.storage.local.get({ enabled: true }).then(({ enabled }) => {
      syncSettingsRadios(!!enabled);
    });

    // Dim button clicked → enable dim, ensure Lights Out is active
    dimBtn.addEventListener("click", () => {
      browser.storage.local.set({ enabled: true });
      syncSettingsRadios(true);
      ensureLightsOutActive();
    });

    // Native buttons clicked → disable dim
    for (const btn of [defaultBtn, lightsOutBtn]) {
      btn.addEventListener("click", () => {
        if (_switchingToDim) return;
        browser.storage.local.set({ enabled: false });
        setRadioUnselected(dimBtn);
      });
    }
  }

  let _switchingToDim = false;

  function ensureLightsOutActive() {
    const dimBtn = document.getElementById(DIM_BTN_ID);
    if (!dimBtn) return;
    const radiogroup = dimBtn.closest('[role="radiogroup"]');
    if (!radiogroup) return;
    const allBtns = radiogroup.querySelectorAll(":scope > div");
    const lightsOutBtn = allBtns[allBtns.length - 1];
    if (!lightsOutBtn) return;

    const loInput = lightsOutBtn.querySelector('input[type="radio"]');
    if (loInput && !loInput.checked) {
      _switchingToDim = true;
      loInput.click();
      loInput.dispatchEvent(new Event("input", { bubbles: true }));
      loInput.dispatchEvent(new Event("change", { bubbles: true }));
      setTimeout(() => { _switchingToDim = false; }, 300);
    }
  }

  function syncSettingsRadios(enabled) {
    const dimBtn = document.getElementById(DIM_BTN_ID);
    if (!dimBtn) return;
    const radiogroup = dimBtn.closest('[role="radiogroup"]');
    if (!radiogroup) return;
    const allBtns = radiogroup.querySelectorAll(":scope > div");
    const lightsOutBtn = allBtns[allBtns.length - 1];

    if (enabled) {
      setRadioSelected(dimBtn);
      for (const btn of allBtns) {
        if (btn !== dimBtn) setRadioUnselected(btn);
      }
    } else {
      setRadioUnselected(dimBtn);
      if (lightsOutBtn) setRadioSelected(lightsOutBtn);
    }
  }

  function setRadioSelected(btnEl) {
    btnEl.style.borderColor = "rgb(29, 155, 240)";
    btnEl.style.borderWidth = "2px";
    const circle = btnEl.querySelector('[role="radio"] > div');
    if (circle) {
      circle.style.backgroundColor = "rgb(29, 155, 240)";
      circle.style.borderColor = "rgb(29, 155, 240)";
      circle.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-jwli3a r-1hjwoze r-12ym1je">' +
        '<g><path d="' + CHECKMARK_PATH + '"></path></g></svg>';
    }
    const input = btnEl.querySelector('input[type="radio"]');
    if (input) input.checked = true;
  }

  function setRadioUnselected(btnEl) {
    btnEl.style.borderColor = "rgb(51, 54, 57)";
    btnEl.style.borderWidth = "1px";
    const circle = btnEl.querySelector('[role="radio"] > div');
    if (circle) {
      circle.style.backgroundColor = "rgba(0, 0, 0, 0)";
      circle.style.borderColor = "rgb(185, 202, 211)";
      circle.innerHTML = "";
    }
    const input = btnEl.querySelector('input[type="radio"]');
    if (input) input.checked = false;
  }

  // ── Storage listener (popup toggle, settings page clicks) ──────

  browser.storage.onChanged.addListener((changes) => {
    if (!changes.enabled) return;
    _enabled = !!changes.enabled.newValue;

    if (_enabled) {
      _suspendedForLight = false;
      startBodyObserver();
      applyDim();
      ensureLightsOutActive();
    } else {
      stopBodyObserver();
      removeDim();
    }
    syncSettingsRadios(_enabled);
  });

  // ── Init ─────────────────────────────────────────────────────────

  // Optimistic early apply: add dim class before async storage read
  // to prevent flash.  Gate on system dark preference.
  if (
    localStorage.getItem("__xt_dim_enabled") !== "0" &&
    (!window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add(DIM_CLASS);
  }

  browser.storage.local.get({ enabled: true }).then(({ enabled }) => {
    if (enabled === undefined) {
      _enabled = true;
      browser.storage.local.set({ enabled: true });
    } else {
      _enabled = !!enabled;
    }

    // Cache state for synchronous access on next page load
    try { localStorage.setItem("__xt_dim_enabled", _enabled ? "1" : "0"); } catch {}

    if (_enabled) {
      const systemDark =
        !window.matchMedia ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) {
        applyDim();
        for (const ms of [500, 1500, 3000, 5000]) setTimeout(fullRescan, ms);
      }
    } else {
      removeDim();
    }

    startDomObserver();
    tryInjectDimButton();

    if (_enabled && document.body) {
      startBodyObserver();
    }
  });

  // Listen for runtime messages from the popup
  browser.runtime.onMessage.addListener((message) => {
    if (typeof message.enabled === "boolean") {
      _enabled = message.enabled;
      try { localStorage.setItem("__xt_dim_enabled", _enabled ? "1" : "0"); } catch {}
      if (_enabled) {
        _suspendedForLight = false;
        applyDim();
      } else {
        removeDim();
      }
    }
  });
})();
