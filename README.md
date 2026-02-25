# X (Twitter) Dim Mode — Safari Extension

A Safari Web Extension that restores the classic **dim mode** (dark-blue theme) to X / Twitter.

Twitter's original dim mode used a soothing dark-blue palette (`#15202B`) instead of pure black. After Twitter rebranded to X the setting was removed, leaving only the harsher "Lights out" black theme. This extension brings the dim look back.

---

## Features

- **Dim button in Display settings** — adds a "Dim" option back into X's Settings → Display → Background picker so you can switch themes natively.
- **One-click toggle** — enable or disable dim mode from the toolbar popup.
- **Instant application** — changes take effect immediately via `storage.onChanged`.
- **Layers on Lights Out** — works *with* X's dark-mode theming instead of fighting it. Overrides X's own CSS variables and utility classes for a seamless result.
- **Background scanner** — a MutationObserver catches dynamically-added black elements and patches them with dim colours.
- **Flash prevention** — a preload stylesheet sets the dim background at `document_start` so there's no flash of black.
- **Classic palette** — faithfully reproduces the original dim-mode colours:
  | Element              | Colour    |
  |----------------------|-----------|
  | Background           | `#15202B` |
  | Elevated surfaces    | `#1E2732` |
  | Borders              | `#38444D` |
  | Primary text         | `#D9D9D9` |
  | Secondary text       | `#8899A6` |
  | Accent               | `#1D9BF0` |
- **Lightweight** — pure CSS + minimal JS; no analytics, no tracking, no remote calls.
- **Works on X Pro** — supports x.com, twitter.com, and pro.x.com.

## Screenshots

| Popup | Dim Mode on X |
|-------|---------------|
| _coming soon_ | _coming soon_ |

## Installation

### From Source (Safari on macOS)

1. **Clone this repository:**

   ```bash
   git clone https://github.com/Manaiakalani/x-twitter-dim-mode.git
   ```

2. **Convert to a Safari extension with Xcode:**

   ```bash
   xcrun safari-web-extension-converter extension/ \
     --project-location ./build \
     --app-name "X Dim Mode" \
     --bundle-identifier com.maximilianstein.x-dim-mode
   ```

   > Requires Xcode 14+ and macOS 13+.

3. **Open the generated Xcode project**, build & run.

4. **Enable the extension** in Safari → Settings → Extensions.

### Manual (Developer mode)

1. Open Safari → Develop → Show Extension Builder.
2. Click **+** → Add Extension → select the `extension/` folder.
3. Click **Install** and enable in Safari Settings.

## How It Works

The extension layers the original dim palette on top of X's **Lights Out** dark mode:

1. **CSS variable overrides** — when `html.xt-dim-mode` is active, the stylesheet overrides X's CSS custom properties on `body.LightsOut` and Tailwind/shadcn variables used in DMs, so colours cascade naturally through X's own theming system.
2. **Utility class targeting** — X uses obfuscated atomic CSS classes (e.g. `.r-kemksi` for black backgrounds). The stylesheet maps these to dim-mode colours.
3. **Background scanner** — a `MutationObserver` watches for newly-added DOM nodes with inline `background-color: rgb(0, 0, 0)` and adds a `.dim-patched` class so the CSS can override them non-destructively.
4. **Display settings injection** — the content script detects X's Display → Background radio group and injects a "Dim" button between Default and Lights Out.
5. **Preload CSS** — loaded at `document_start` before any JS, sets the html background to dim-blue under `prefers-color-scheme: dark` to prevent any flash of black.
6. **Body class observer** — watches `body.LightsOut` to sync with X's theme state. Automatically suspends dim if the user switches to light mode.

## Project Structure

```
extension/
├── manifest.json        # Web extension manifest (v3)
├── background.js        # Service worker — sets defaults on install
├── preload.css          # Flash-prevention background (document_start)
├── content.css          # Dim-mode CSS variable overrides & class targeting
├── content.js           # Toggle logic, scanner, settings injection, body observer
├── popup/
│   ├── popup.html       # Toolbar popup UI
│   ├── popup.css        # Popup styles
│   └── popup.js         # Toggle switch (writes to storage)
└── images/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    ├── icon-128.png
    └── icon-256.png
```

## Contributing

Contributions are welcome! Please open an issue or pull request.

## License

This project is licensed under the [MIT License](LICENSE).
