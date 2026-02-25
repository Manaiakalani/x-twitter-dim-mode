/*
 * X (Twitter) Dim Mode — Background Service Worker
 */

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get({ enabled: true }).then((result) => {
    if (result.enabled === undefined) {
      browser.storage.local.set({ enabled: true });
    }
  });
});
