# Auralis — LG webOS TV App

A production-ready LG webOS TV music streaming app that integrates with existing eapk-backed Saavn and YouTube Music modules.

---

## Project Structure

```
echo-tv/
├── appinfo.json            # webOS app manifest
├── icon.png                # App icon (80×80 PNG)
├── icon_source.svg         # Icon source vector
├── index.html              # Main HTML entry point
├── style.css               # Full UI stylesheet (1920×1080 scaled)
├── app.js                  # Main application controller
└── js/
    ├── navigation/
    │   ├── dpad.js          # D-Pad / standard remote navigation
    │   └── pointer.js       # Magic Remote pointer navigation
    ├── player/
    │   └── playback.js      # HTML5 Audio playback controller
    └── sources/
        ├── saavn.js         # JioSaavn eapk bridge module
        └── ytmusic.js       # YouTube Music eapk bridge module
```

---

## Architecture

### UI Scaling Layer

The UI is authored at **1920×1080** (native TV resolution). A responsive scaling layer in both CSS and JS detects the actual viewport and applies `transform: scale()` so the layout fills any screen without distortion, maintaining original proportions.

### Navigation System

Two input modes operate cooperatively:

| Input                       | Method                       | Behavior                                              |
| --------------------------- | ---------------------------- | ----------------------------------------------------- |
| **D-Pad** (Standard Remote) | Arrow keys (37-40) + OK (13) | Spatial focus navigation across `.focusable` elements |
| **Magic Remote** (Pointer)  | Mouse hover + click          | Hover applies focus class; click triggers action      |

When a key is pressed, pointer mode deactivates. When the pointer moves, D-pad focus clears. No conflicts.

### Source Modules

`saavn.js` and `ytmusic.js` are **bridge modules** — they do NOT contain API logic. They call into the existing **eapk-backed extension system** via `window.EchoEapk.call()`:

```js
window.EchoEapk.call(
  "dev.brahmkshatriya.echo.extension.saavn",
  "getStreamUrl",
  { id: trackId },
);
```

Each module normalizes responses into a common track format and exposes:

- `search(query, type)` → `Promise<Track[]>`
- `getFeed(section)` → `Promise<Track[]>`
- `getStreamUrl(trackId)` → `Promise<string>`
- `getDetails(id, type)` → `Promise<Object>`
- `getRecent()` → `Promise<Track[]>`

### Playback

HTML5 `<audio>` element with full lifecycle management:

```js
audio.src = STREAM_URL;
audio.play();
```

Supports: Play, Pause, Next, Previous, Shuffle, Repeat (None/All/One), Seek, Queue management, Media Session API.

---

## Testing

### 1. webOS Simulator

1. Install the [webOS TV SDK](https://webostv.developer.lge.com/develop/tools/sdk-introduction)
2. Launch the **webOS TV Simulator** from the SDK
3. In the simulator, load the project directory:
   ```
   File → Open → select echo-tv/ folder
   ```
4. The app will render at 1920×1080 in the simulator
5. Use keyboard arrow keys to simulate D-pad; mouse simulates Magic Remote

### 2. Local Server Testing (TV Browser)

1. Serve the app locally:
   ```bash
   cd echo-tv
   npx http-server . -p 8080 --cors
   ```
2. On the LG TV, open the **Web Browser** app
3. Navigate to `http://<YOUR_PC_IP>:8080`
4. The scaling layer will adapt to the TV's browser viewport
5. Use the Magic Remote to interact

### 3. Real LG TV (Developer Mode)

1. On the TV: **LG Content Store** → search **Developer Mode** → install & sign in
2. Enable Developer Mode and note the TV's IP address
3. On your PC:

   ```bash
   # Register the TV
   ares-setup-device

   # Follow prompts:
   # Device Name: lg-tv
   # IP: <TV_IP>
   # Port: 9922
   # SSH User: prisoner

   # Verify connection
   ares-device-info -d lg-tv
   ```

4. Package, install, and launch (see below)

---

## Packaging

### Prerequisites

Install the **webOS TV CLI** (part of the webOS TV SDK):

```bash
npm install -g @webos-tools/cli
```

Verify installation:

```bash
ares-package --version
```

### Generate Signing Key (Optional, for LG Store)

```bash
ares-generate -t signkey -o mykey
```

### Package into .ipk

```bash
cd echo-tv
ares-package .
```

This produces: `com.echo.tv_1.0.0_all.ipk`

### With minification (production):

```bash
ares-package . --minify
```

---

## Installation

### Connect to TV

```bash
ares-setup-device
```

Follow the interactive prompts to add your TV:

- **Name**: `lg-tv`
- **IP**: Your TV's IP address
- **Port**: `9922`
- **User**: `prisoner`

### Install the App

```bash
ares-install com.echo.tv_1.0.0_all.ipk -d lg-tv
```

### Launch

```bash
ares-launch com.echo.tv -d lg-tv
```

### Debug (Chrome DevTools)

```bash
ares-inspect com.echo.tv -d lg-tv --open
```

This opens Chrome DevTools connected to the app running on the TV.

### Uninstall

```bash
ares-install --remove com.echo.tv -d lg-tv
```

---

## Key Bindings (LG Remote)

| Button     | Key Code | Action                  |
| ---------- | -------- | ----------------------- |
| Left       | 37       | Navigate left           |
| Up         | 38       | Navigate up             |
| Right      | 39       | Navigate right          |
| Down       | 40       | Navigate down           |
| OK / Enter | 13       | Select / Activate       |
| Back       | 461      | Go back / Close overlay |
| Red        | 403      | (Reserved)              |
| Green      | 404      | (Reserved)              |
| Yellow     | 405      | (Reserved)              |
| Blue       | 406      | (Reserved)              |

---

## Design Tokens (from Echo Android)

| Token                    | Value                    | Usage                                              |
| ------------------------ | ------------------------ | -------------------------------------------------- |
| `--echo-accent`          | `#22bbff`                | Primary brand color                                |
| `--bg-primary`           | `#000000`                | AMOLED background                                  |
| `--bg-surface-container` | `#1e1e1e`                | Cards, nav, player bar                             |
| `--fg-primary`           | `#ffffff`                | Main text                                          |
| `--fg-secondary`         | `rgba(255,255,255,0.72)` | Secondary text                                     |
| `--card-corner`          | `12px`                   | Card border radius (from `itemCorner: 8dp` scaled) |

---

## Production Checklist

- [ ] Replace `icon.png` with proper 80×80 branded icon
- [ ] Add `largeIcon.png` (130×130) for app launcher
- [ ] Add `bgImage.png` (1920×1080) for app launcher background
- [ ] Connect `EchoEapk` bridge to actual eapk runtime
- [ ] Test on webOS 4.x, 5.x, 6.x, and 22+ targets
- [ ] Verify audio codec support (AAC, MP3, Opus)
- [ ] Handle TV sleep/wake lifecycle gracefully
- [ ] Add error boundary for source module failures
- [ ] Performance profile on low-end webOS devices
