/**
 * VideoRender — Summary recap panel
 * Builds a summary of all render settings before creating the video.
 * @author TxTony
 */

import state from './state.js';
import { grainLabel, contrastLabel, brightnessLabel } from './labels.js';

/**
 * Build and display the recap panel with current settings.
 * @param {HTMLElement} gridEl - The recap grid container
 * @param {Object} els - DOM elements for reading current values
 */
export function buildRecap(gridEl, els) {
  const rows = [];

  function row(label, value, highlight) {
    rows.push(`<div class="recap-row"><span class="recap-label">${label}</span><span class="recap-value${highlight ? ' active' : ''}">${value}</span></div>`);
  }

  if (state.visualPath) row('Visual', state.visualPath.split(/[/\\]/).pop());
  if (state.audioPath) row('Audio', state.audioPath.split(/[/\\]/).pop());

  const activeProfile = document.querySelector('.profile-btn.active');
  if (activeProfile) row('Output', activeProfile.textContent.trim());
  row('Resolution', els.resolution.value);

  const activePreset = document.querySelector('.preset-btn.active');
  const styleName = activePreset ? activePreset.textContent.trim() : 'Custom';
  const g = parseInt(els.grain.value);
  const c = parseFloat(els.contrast.value);
  const b = parseFloat(els.brightness.value);
  const hasEffects = g > 0 || c !== 1.0 || b !== 0;
  row('Style', styleName, hasEffects);
  if (g > 0) row('Film grain', grainLabel(g), true);
  if (c !== 1.0) row('Contrast', contrastLabel(c), true);
  if (b !== 0) row('Brightness', brightnessLabel(b), true);

  if (state.overlayPath) {
    row('Overlay', state.overlayPath.split(/[/\\]/).pop(), true);
    row('Overlay position', els.overlayPosition.value);
    row('Overlay timing', `${els.overlayStart.value}s → ${parseFloat(els.overlayStart.value) + parseFloat(els.overlayDuration.value)}s`);
  }

  if (els.metaTitle.value) row('Title', els.metaTitle.value);
  if (els.metaArtist.value) row('Artist', els.metaArtist.value);
  if (els.metaAlbum.value) row('Album', els.metaAlbum.value);
  if (els.metaGenre.value) row('Genre', els.metaGenre.value);
  if (els.metaDate.value) row('Year', els.metaDate.value);

  row('End padding', parseFloat(els.endPadding.value) + 's');

  gridEl.innerHTML = rows.join('');
}

/**
 * Show or hide the recap panel based on whether both files are loaded.
 * @param {HTMLElement} panelEl - The recap panel element
 * @param {HTMLElement} gridEl - The recap grid element
 * @param {Object} els - DOM elements for buildRecap
 */
export function updateRecap(panelEl, gridEl, els) {
  if (state.visualPath && state.audioPath) {
    buildRecap(gridEl, els);
    panelEl.style.display = 'block';
  } else {
    panelEl.style.display = 'none';
  }
}
