# X (Twitter) Dim Mode — Safari Extension

A Safari Web Extension that restores the classic **dim mode** (dark-blue theme) to X / Twitter.

Twitter's original dim mode used a soothing dark-blue palette (`#15202B`) instead of pure black. After Twitter rebranded to X the setting was removed, leaving only the harsher "Lights out" black theme. This extension brings the dim look back.

---

## Features

- **One-click toggle** — enable or disable dim mode from the toolbar popup.
- **Instant application** — changes take effect immediately on all open X / Twitter tabs.
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

The extension injects a small CSS stylesheet and a content script into `x.com` and `twitter.com` pages. When enabled, it adds the class `xt-dim-mode` to the `<html>` element, activating CSS rules that override Twitter's inline styles with the classic dim palette. A MutationObserver ensures the theme persists even as Twitter dynamically updates the DOM.

## Project Structure

```
extension/
├── manifest.json        # Web extension manifest (v3)
├── background.js        # Service worker — sets defaults on install
├── content.css          # Dim-mode CSS overrides
├── content.js           # Toggles the dim class & observes mutations
├── popup/
│   ├── popup.html       # Toolbar popup UI
│   ├── popup.css        # Popup styles
│   └── popup.js         # Toggle logic & messaging
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
