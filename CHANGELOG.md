# Changelog

## v1.2.0 — 2026-04-08

### New Features
- **Tab navigation** — switch between tools via a tab bar (Create Video, Convert Audio, Upscale Image, Convert Image)
- **Audio converter** — convert audio files between MP3, WAV, FLAC, OGG, AAC, and WMA. Configurable bitrate, sample rate, and channel count. Bitrate selector auto-hides for lossless formats. Progress bar with cancel support.
- **Image upscaler** — upscale images to 2x, 4x, or custom resolution. Choice of scaling algorithm: Lanczos, Bicubic, Bilinear, or Spline. Live output dimension preview. Exports to PNG, JPG, BMP, or TIFF.
- **Image converter** — convert images between PNG, JPEG, WebP, BMP, TIFF, and ICO. Quality slider (1–100%) that auto-hides for lossless formats.

### Code Quality
- **New backend modules:**
  - `lib/convert.js` — Audio conversion with codec/bitrate mapping
  - `lib/upscale.js` — Image upscaling with dimension probing and algorithm selection
  - `lib/imgconvert.js` — Image format conversion with per-format quality handling
- **New frontend modules:**
  - `modules/converter.js` — Audio converter tab UI
  - `modules/upscaler.js` — Image upscaler tab UI
  - `modules/imgconverter.js` — Image converter tab UI
- All new lib modules are CLI-reusable (no Electron dependencies, dependency-injected paths)

---

## v1.1.0 — 2026-04-02

### New Features
- **Render cancellation** — click the render button during encoding to abort. FFmpeg process is also killed when the app is closed.
- **GitHub Pages landing page** — download page at https://txtony.github.io/Video-Render/ with app overview and SmartScreen disclaimer.
- **Auto-update system** — app checks GitHub Releases for new versions, downloads silently, installs on restart.

### Improvements
- **Double-click protection** — render button disables immediately on click, preventing concurrent FFmpeg processes.
- **Memory management** — blob URLs are properly revoked when files are replaced or removed.
- **Safer IPC** — main window existence is checked before sending messages, preventing crashes if window closes during render.
- **Smaller stderr footprint** — FFmpeg error output capped at 2000 chars to prevent memory bloat on long encodes.
- **Pulse interval safety** — progress animation always cleaned up via try/finally, even on errors.

### Code Quality
- **Backend refactored into modules:**
  - `lib/ffmpeg.js` — FFmpeg/FFprobe path resolution, process spawning, media probing
  - `lib/args.js` — Pure functions for FFmpeg argument building (fully unit-testable)
  - `lib/render.js` — Render orchestration (validate, probe, build args, run)
  - `lib/updater.js` — Auto-update manager
  - `ipc.js` — IPC handler registration
  - `main.js` — Reduced to 45 lines of Electron lifecycle glue
- **Frontend refactored into ES modules:**
  - `modules/state.js` — Shared app state
  - `modules/labels.js` — Human-friendly slider labels (pure, testable)
  - `modules/presets.js` — Visual presets and output profiles
  - `modules/dropzones.js` — Drag & drop setup
  - `modules/preview.js` — Live preview filters and overlay positioning
  - `modules/animation.js` — Preview playback animation
  - `modules/metadata.js` — Metadata auto-fill from audio tags
  - `modules/guidance.js` — Step guidance banner
  - `modules/recap.js` — Summary panel builder
  - `modules/render.js` — Render handler with cancel and progress
- **JSDoc headers** on every file (author, description) and every function (params, returns)

### Docs
- Added `RELEASE.md` — step-by-step release process
- Added `TODO.md` — code quality checklist with status
- Added `CHANGELOG.md`

---

## v1.0.0 — 2026-04-02

### Initial Release
- **Drag & drop** image/video + audio to create an MP4 video
- **Video support** — use a video as background instead of a static image
- **Visual style presets** — Gritty, Clean, VHS Tape, Dark & Raw, Lo-Fi, or manual sliders
- **Film grain, contrast, brightness** controls with live CSS preview
- **Title/logo overlay** — drop a PNG with transparency, position anywhere (preset or drag), set size, opacity, timing, fade in/out animation
- **Preview animation** — real-time playback of overlay fade timing with seekable timeline
- **Output profiles** — YouTube, Facebook, Instagram, Best Quality, Quick Share, or full manual control (resolution, bitrate, CRF)
- **Metadata** — title, artist, album, genre, year, description. Auto-filled from audio file tags via ffprobe
- **Smart encoding** — aspect ratio preserved (no stretching), low framerate for still images, CRF auto-bump for high grain
- **End padding** — configurable extra time after song ends (default 2s)
- **Summary recap** — live panel showing all settings before rendering
- **Step-by-step guidance** — orange/green banner guiding new users through the process
- **Two-column layout** — essential flow on the left, optional settings on the right
- **Friendly error messages** — FFmpeg errors translated to plain english
- **Bundled FFmpeg** — no external install required
