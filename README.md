# Auralis — Music Player for LG webOS TV

<p align="center">
  <img src="icon.png" alt="Auralis" width="120" height="120" style="border-radius: 24px;" />
</p>

<p align="center">
  <strong>A beautiful, Spotify-inspired music streaming app built for LG Smart TVs.</strong><br/>
  Stream millions of songs — optimized for D-Pad, Magic Remote, and 4K displays.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.23-1db954?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/platform-webOS%20TV-a855f7?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/resolution-1920×1080-3b82f6?style=flat-square" alt="Resolution" />
  <img src="https://img.shields.io/badge/quality-320kbps%20HD-f59e0b?style=flat-square" alt="Quality" />
</p>

---

## Features

### 🎵 Playback

- **High-quality streaming** — 320 kbps audio via External api 
- **Full queue management** — play next, remove from queue, shuffle, repeat
- **Immersive full player** — album art background with blur, seekbar, and controls
- **Queue side panel** — view upcoming tracks and recently played without leaving the player

### 📚 Library

- **Playlists** — create, rename, delete, and browse playlists
- **Playlist detail view** — view all songs, play from any position, remove individual tracks
- **Liked songs** — heart any track, plays as a continuous queue
- **Recently played** — auto-tracked history

### 🔍 Search

- **Real-time search** — debounced input with instant results
- **Queue-aware results** — clicking a result queues all search results from that position

### 🎮 Navigation

- **D-Pad optimized** — full keyboard/remote navigation with focus management
- **Magic Remote** — pointer support for LG's motion remote
- **Long-press actions** — hold Enter/OK on playlist cards to rename or delete
- **Back button chain** — hierarchical navigation (overlays → detail views → tabs → home)

### 🎨 Personalization

- **5 color themes** — Midnight, Ocean, Forest, Sunset, AMOLED
- **Persistent storage** — playlists, liked songs, theme, and preferences saved locally

---

## Project Structure

```
Auralis/
├── appinfo.json              # webOS app manifest (com.echo.tv)
├── icon.png                  # App launcher icon (500×500)
├── index.html                # Main HTML entry point
├── style.css                 # Full UI stylesheet (1920×1080)
├── app.js                    # Main application controller
└── js/
    ├── eapk-loader.js        # EAPK bridge module loader
    ├── navigation/
    │   ├── dpad.js            # D-Pad / remote navigation
    │   └── pointer.js         # Magic Remote pointer support
    ├── player/
        └── playback.js        
```

---

## Tech Stack

| Layer        | Technology                      |
| ------------ | ------------------------------- |
| Platform     | LG webOS TV (web app)           |
| UI           | Vanilla HTML / CSS / JavaScript |
| Font         | Montserrat (Google Fonts)       |
| Audio        | HTML5 Audio API                 |
| Music Source | External api  |
| Storage      | localStorage                    |
| Packaging    | ares-package (webOS CLI)        |

---

## Build & Install

### Prerequisites

- [webOS TV SDK](https://webostv.developer.lge.com/develop/tools/cli-installation) (`ares-*` CLI tools)
- LG TV with Developer Mode enabled

### Build the IPK

```bash
cd Auralis
ares-package . -o ..
```

This produces `com.echo.tv_1.0.23_all.ipk` in the parent directory.

### Install on TV

```bash
ares-install --device <your-tv> ../com.echo.tv_1.0.23_all.ipk
```

### Launch

```bash
ares-launch --device <your-tv> com.echo.tv
```

---

## Storage Keys

| Key                 | Purpose                         |
| ------------------- | ------------------------------- |
| `echo_playlists`    | User-created playlists & tracks |
| `echo_liked`        | Liked songs list                |
| `echo_theme`        | Selected color theme            |
| `echo_sidebar_size` | Navigation sidebar size         |
| `echo_recent`       | Recently played tracks          |

---

## Version History

| Version    | Highlights                                                                    |
| ---------- | ----------------------------------------------------------------------------- |
| **1.0.23** | Playlist detail view — browse & remove individual songs                       |
| **1.0.22** | Auralis branding, playlist rename/delete, liked songs queue, settings credits |
| **1.0.21** | Lottie-based app icon redesign                                                |
| **1.0.20** | Heart toggle in full player, seekbar polish                                   |
| **1.0.19** | Queue side panel, play next, full player layout                               |
| **1.0.18** | TV-optimized scaling & focus ring tuning                                      |
| **1.0.13** | Spotify-style bottom bar player                                               |
| **1.0.8**  | Initial feature-complete release                                              |

---

## Credits

Made by **Ruthvik**

---

## License

This project is for personal use on LG webOS TVs.
