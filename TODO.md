# VideoRender — Code Quality Checklist

## High Priority

- [x] **Double-click race condition** — render button disabled immediately on click, before save dialog. `isRendering` flag prevents concurrent renders.

## Medium-High Priority

- [x] **Object URLs never revoked** — old blob URLs are now revoked before creating new ones on each drop. Also revoked on overlay remove.
- [x] **No render cancellation** — FFmpeg process is tracked, cancel via button click during render or `cancel-render` IPC. Process killed on window close.

## Medium Priority

- [x] **stderr grows unbounded** — capped to last 2000 chars.
- [x] **mainWindow crash on close** — `sendToRenderer()` helper guards against destroyed window. FFmpeg killed on `window-all-closed`.
- [x] **Pulse interval leak** — render wrapped in try/finally, `clearInterval` always runs.
- [ ] **No input validation** — resolution, numbers, metadata not validated in main process. Low risk (local app, values come from own UI).
- [ ] **IPC listeners stack** — `onProgress`/`onUpdateStatus` add listeners on each call. Low risk (called once at load).
- [ ] **No FFmpeg check at startup** — user gets cryptic error if missing. Low risk (bundled with installer).

## Low Priority (won't fix — local desktop app)

- [ ] XSS via innerHTML — filenames come from user's own filesystem
- [ ] No CSP — no remote content loaded
- [ ] autoUpdater window reference — silently caught by error handler
- [ ] resolution NaN — values come from own dropdown, can't be wrong
