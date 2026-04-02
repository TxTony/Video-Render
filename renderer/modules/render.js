/**
 * VideoRender — Render handler
 * Manages the render button click, progress display, and result feedback.
 * @author TxTony
 */

import state from './state.js';

/**
 * Translate raw FFmpeg error into a user-friendly message.
 * @param {string} raw - Raw error string from FFmpeg stderr
 * @returns {string} Human-readable error message
 */
function friendlyError(raw) {
  if (raw.includes('No such file or directory')) return 'Could not find one of your files. Try dropping them again.';
  if (raw.includes('Invalid data found')) return 'One of your files might be corrupted or in an unsupported format. Try a different file.';
  if (raw.includes('Permission denied')) return 'Cannot save to that location. Try choosing a different folder.';
  if (raw.includes('already exists')) return 'A file with that name already exists. Choose a different name.';
  if (raw.includes('Encoder') || raw.includes('codec')) return 'Video encoding error. Try a different output format.';
  return 'Something went wrong. Check that your files are not corrupted and try again.';
}

/**
 * Collect all render options from the current UI state into a plain object.
 * @param {Object} els - All DOM elements for reading option values
 * @returns {Object} Render options ready to send to the main process
 */
function collectRenderOpts(els) {
  return {
    visualPath: state.visualPath,
    visualType: state.visualType,
    audioPath: state.audioPath,
    overlayPath: state.overlayPath || null,
    overlayPosition: els.overlayPosition.value,
    overlayCustomX: state.customOverlayX,
    overlayCustomY: state.customOverlayY,
    overlaySize: parseInt(els.overlaySize.value),
    overlayOpacity: parseFloat(els.overlayOpacity.value),
    overlayStart: parseFloat(els.overlayStart.value),
    overlayDuration: parseFloat(els.overlayDuration.value),
    overlayTransition: els.overlayTransition.value,
    endPadding: parseFloat(els.endPadding.value),
    resolution: els.resolution.value,
    audioBitrate: els.audioBitrate.value,
    videoBitrate: parseInt(els.videoBitrate.value),
    crf: parseInt(els.crf.value),
    grain: parseInt(els.grain.value),
    contrast: parseFloat(els.contrast.value),
    brightness: parseFloat(els.brightness.value),
    metaTitle: els.metaTitle.value,
    metaArtist: els.metaArtist.value,
    metaAlbum: els.metaAlbum.value,
    metaGenre: els.metaGenre.value,
    metaDate: els.metaDate.value,
    metaComment: els.metaComment.value
  };
}

/**
 * Set up the render button click handler with cancel support and progress display.
 * @param {Object} ui - DOM elements: { renderBtn, progressArea, progressFill, progressText, result }
 * @param {Object} optEls - DOM elements for collectRenderOpts
 * @param {function(): void} onBuildRecap - Called to refresh the recap before render
 * @param {function(): void} onUpdateRenderBtn - Called to restore button state
 */
export function setupRenderHandler(ui, optEls, onBuildRecap, onUpdateRenderBtn) {
  ui.renderBtn.addEventListener('click', async () => {
    if (state.isRendering) return;
    state.isRendering = true;
    ui.renderBtn.disabled = true;
    ui.renderBtn.textContent = 'Choose save location...';

    onBuildRecap();
    const outputPath = await window.api.pickOutput();
    if (!outputPath) {
      state.isRendering = false;
      ui.renderBtn.textContent = 'Create Video';
      onUpdateRenderBtn();
      return;
    }

    ui.renderBtn.textContent = 'Creating your video... (click to cancel)';
    ui.progressArea.style.display = 'block';
    ui.progressFill.style.width = '0%';
    ui.progressText.textContent = 'Starting...';
    ui.result.style.display = 'none';

    let progress = 0;
    const pulse = setInterval(() => {
      progress = Math.min(progress + 0.5, 90);
      ui.progressFill.style.width = `${progress}%`;
    }, 200);

    const cancelHandler = () => { window.api.cancelRender(); };
    ui.renderBtn.addEventListener('click', cancelHandler, { once: true });

    try {
      const opts = collectRenderOpts(optEls);
      opts.outputPath = outputPath;
      const res = await window.api.render(opts);

      if (res.success) {
        ui.progressFill.style.width = '100%';
        ui.progressText.textContent = 'Done!';
        ui.result.className = 'result success';
        ui.result.textContent = 'Your video is ready! Saved to:\n' + res.output;
        ui.result.style.display = 'block';
      } else if (res.cancelled) {
        ui.progressFill.style.width = '0%';
        ui.progressText.textContent = 'Cancelled';
        ui.result.className = 'result error';
        ui.result.textContent = 'Render cancelled.';
        ui.result.style.display = 'block';
      } else {
        ui.progressFill.style.width = '0%';
        ui.progressText.textContent = '';
        ui.result.className = 'result error';
        ui.result.textContent = friendlyError(res.error);
        ui.result.style.display = 'block';
      }
    } finally {
      clearInterval(pulse);
      ui.renderBtn.removeEventListener('click', cancelHandler);
      state.isRendering = false;
      ui.renderBtn.disabled = false;
      ui.renderBtn.textContent = 'Create Video';
      onUpdateRenderBtn();
    }
  });
}
