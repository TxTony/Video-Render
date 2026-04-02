/**
 * VideoRender — Preview animation playback
 * Simulates overlay fade in/out timing on the preview with a playback timeline.
 * @author TxTony
 */

import state from './state.js';
import { updatePreviewFilters, updateOverlayPreview } from './preview.js';

let playing = false;
let time = 0;
let raf = null;
let lastTs = null;

/**
 * @returns {boolean} Whether the animation is currently playing
 */
export function isPlaying() { return playing; }

/**
 * Calculate the preview duration based on overlay timing settings.
 * @param {Object} els - { overlayStart, overlayDuration }
 * @returns {number} Duration in seconds
 */
function getPreviewDuration(els) {
  const tStart = parseFloat(els.overlayStart.value) || 0;
  const tDur = parseFloat(els.overlayDuration.value) || 5;
  return Math.max(tStart + tDur + 2, 10);
}

/**
 * Get fade durations based on the selected transition type.
 * @param {HTMLSelectElement} overlayTransition - The transition select element
 * @returns {{ fadeIn: number, fadeOut: number }} Fade durations in seconds
 */
function getFadeDurations(overlayTransition) {
  const t = overlayTransition.value;
  if (t === 'fade') return { fadeIn: 0.5, fadeOut: 0.5 };
  if (t === 'fade-long') return { fadeIn: 1.5, fadeOut: 1.5 };
  return { fadeIn: 0, fadeOut: 0 };
}

/**
 * Update the preview to reflect overlay visibility at a given time.
 * @param {number} t - Current time in seconds
 * @param {Object} els - DOM elements for overlay controls and timeline display
 */
function updateAnimation(t, els) {
  if (!state.overlayPath) return;

  const tStart = parseFloat(els.overlayStart.value) || 0;
  const tDur = parseFloat(els.overlayDuration.value) || 5;
  const tEnd = tStart + tDur;
  const { fadeIn, fadeOut } = getFadeDurations(els.overlayTransition);
  const baseOpacity = parseFloat(els.overlayOpacity.value);

  let alpha = 0;
  if (t >= tStart && t <= tEnd) {
    alpha = 1;
    if (fadeIn > 0 && t < tStart + fadeIn) alpha = (t - tStart) / fadeIn;
    if (fadeOut > 0 && t > tEnd - fadeOut) alpha = (tEnd - t) / fadeOut;
    alpha = Math.max(0, Math.min(1, alpha));
  }

  els.previewOverlay.style.opacity = alpha * baseOpacity;
  els.previewOverlay.style.display = alpha > 0 ? 'block' : 'none';

  const dur = getPreviewDuration(els);
  const pct = (t / dur) * 100;
  els.timelineCursor.style.left = pct + '%';
  els.timeBadge.textContent = t.toFixed(1) + 's';
  els.timeLabel.textContent = `${t.toFixed(1)}s / ${dur}s`;

  const startPct = (tStart / dur) * 100;
  const endPct = (tEnd / dur) * 100;
  els.timelineOverlay.style.left = startPct + '%';
  els.timelineOverlay.style.width = (endPct - startPct) + '%';
}

/**
 * Start the preview animation loop.
 * @param {Object} els - All DOM elements needed for animation and filter updates
 * @param {Object} filterEls - DOM elements for updatePreviewFilters
 */
export function startAnim(els, filterEls) {
  playing = true;
  lastTs = null;
  time = 0;
  els.playBtn.classList.add('playing');
  els.playBtn.innerHTML = '&#9724; Stop';
  els.timeBadge.style.display = 'block';
  els.grainOverlay.classList.add('animating');

  function loop(ts) {
    if (!playing) return;
    if (lastTs === null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    time += dt;

    const dur = getPreviewDuration(els);
    if (time >= dur) time = 0;

    updatePreviewFilters(filterEls);
    updateAnimation(time, els);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
}

/**
 * Stop the preview animation and restore static overlay.
 * @param {Object} els - DOM elements for animation controls
 * @param {Object} overlayEls - DOM elements for updateOverlayPreview
 */
export function stopAnim(els, overlayEls) {
  playing = false;
  els.playBtn.classList.remove('playing');
  els.playBtn.innerHTML = '&#9654; Preview animation';
  els.timeBadge.style.display = 'none';
  els.grainOverlay.classList.remove('animating');
  if (raf) cancelAnimationFrame(raf);
  updateOverlayPreview(overlayEls);
}

/**
 * Seek the animation to a specific position on the timeline.
 * @param {MouseEvent} e - Click event on the timeline bar
 * @param {HTMLElement} timelineBar - The timeline bar element
 * @param {Object} els - DOM elements for animation update
 */
export function seekTimeline(e, timelineBar, els) {
  const rect = timelineBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  time = pct * getPreviewDuration(els);
  updateAnimation(time, els);
}

/**
 * Show or hide the playback controls based on overlay presence.
 * @param {HTMLElement} playbackEl - The playback controls container
 * @param {Object} animEls - Elements for stopAnim
 * @param {Object} overlayEls - Elements for updateOverlayPreview
 */
export function updatePlaybackVisibility(playbackEl, animEls, overlayEls) {
  playbackEl.style.display = state.overlayPath ? 'flex' : 'none';
  if (!state.overlayPath && playing) stopAnim(animEls, overlayEls);
}
