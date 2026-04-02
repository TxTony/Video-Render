# VideoRender — Release Process

## 1. Bump the version

Edit `package.json`, change `"version"`:
```json
"version": "1.1.0"
```

## 2. Commit and push

```bash
git add -A
git commit -m "Release v1.1.0"
git push
```

## 3. Build the installer

```bash
npm run build:win
```

This creates the `.exe` installer + `latest.yml` in the `dist/` folder.

## 4. Create GitHub Release

```bash
gh release create v1.1.0 "dist/VideoRender Setup 1.1.0.exe" dist/latest.yml --title "VideoRender v1.1.0" --notes "What changed in this version"
```

**Important:** Always attach `latest.yml` — the auto-updater needs it to detect new versions.

## 5. Done

Existing users will see "Downloading update..." next time they open the app. The update installs automatically on restart.

## Notes

- FFmpeg binaries must be in the `ffmpeg/` folder before building (not committed to git)
- The version in `package.json` must match the git tag (e.g. `v1.1.0`)
- Installer is ~130MB (Electron + FFmpeg)
