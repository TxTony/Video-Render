# VideoRender

Turn your album art + audio into a video, ready for YouTube, Facebook, or Instagram.

## Features

- **Drag & drop** — drop your image/video + audio, click Create Video
- **Visual styles** — Gritty, Clean, VHS Tape, Dark & Raw, Lo-Fi, or manual
- **Title overlay** — add a logo/title PNG with fade in/out animation
- **Output presets** — YouTube, Facebook, Instagram, Best Quality, Quick Share
- **Metadata** — auto-fills title, artist, album from your audio file
- **Live preview** — see effects and overlay animation before rendering
- **Auto-updates** — the app updates itself when a new version is available

## Download

Get the latest version from the [Releases page](https://github.com/TxTony/Video-Render/releases/latest).

## Development

```bash
npm install
npm start
```

## Build

```bash
# Windows installer
npm run build:win

# Linux AppImage
npm run build:linux
```

**Note:** Place FFmpeg binaries in the `ffmpeg/` folder before building. Download from [ffmpeg.org](https://ffmpeg.org/download.html).
