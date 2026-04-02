/**
 * VideoRender — Live preview
 * Manages CSS filter preview and overlay positioning/dragging on the preview panel.
 * @author TxTony
 */

import state from './state.js';

/**
 * Apply CSS contrast/brightness filters and grain overlay to the preview.
 * @param {Object} els - DOM elements: { previewImg, previewVid, grainOverlay, contrast, brightness, grain }
 */
export function updatePreviewFilters(els) {
  const c = parseFloat(els.contrast.value);
  const b = parseFloat(els.brightness.value);
  const g = parseInt(els.grain.value);

  const cssFilter = `contrast(${c}) brightness(${1 + b})`;
  els.previewImg.style.filter = cssFilter;
  els.previewVid.style.filter = cssFilter;

  els.grainOverlay.style.opacity = g / 40 * 0.6;
}

/**
 * Update the overlay image position, size, and opacity on the preview.
 * Handles preset positions and custom drag position.
 * @param {Object} els - DOM elements: { previewOverlay, overlayOpacity, overlaySize, overlayPosition, customPosInfo, customXVal, customYVal }
 */
export function updateOverlayPreview(els) {
  if (!state.overlayPath) {
    els.previewOverlay.style.display = 'none';
    return;
  }
  els.previewOverlay.style.display = 'block';
  els.previewOverlay.style.opacity = els.overlayOpacity.value;

  const size = parseInt(els.overlaySize.value);
  els.previewOverlay.style.width = size + '%';
  els.previewOverlay.style.height = 'auto';
  els.previewOverlay.style.maxHeight = size + '%';

  const pos = els.overlayPosition.value;
  const pad = '2%';
  els.previewOverlay.style.top = '';
  els.previewOverlay.style.bottom = '';
  els.previewOverlay.style.left = '';
  els.previewOverlay.style.right = '';
  els.previewOverlay.style.transform = '';

  const isCustom = pos === 'custom';
  els.previewOverlay.classList.toggle('no-drag', !isCustom);
  els.customPosInfo.style.display = isCustom ? 'block' : 'none';

  if (isCustom) {
    els.previewOverlay.style.left = state.customOverlayX + '%';
    els.previewOverlay.style.top = state.customOverlayY + '%';
    els.previewOverlay.style.transform = 'translate(-50%, -50%)';
    els.customXVal.textContent = Math.round(state.customOverlayX);
    els.customYVal.textContent = Math.round(state.customOverlayY);
    return;
  }

  switch (pos) {
    case 'center':
      els.previewOverlay.style.top = '50%';
      els.previewOverlay.style.left = '50%';
      els.previewOverlay.style.transform = 'translate(-50%, -50%)';
      break;
    case 'top-left':
      els.previewOverlay.style.top = pad;
      els.previewOverlay.style.left = pad;
      break;
    case 'top-right':
      els.previewOverlay.style.top = pad;
      els.previewOverlay.style.right = pad;
      break;
    case 'bottom-left':
      els.previewOverlay.style.bottom = pad;
      els.previewOverlay.style.left = pad;
      break;
    case 'bottom-right':
      els.previewOverlay.style.bottom = pad;
      els.previewOverlay.style.right = pad;
      break;
  }
}

/**
 * Set up mouse drag handlers for custom overlay positioning on the preview.
 * @param {HTMLElement} previewOverlay - The overlay image element
 * @param {HTMLElement} previewContainer - The preview container element
 * @param {HTMLSelectElement} overlayPosition - The position select element
 * @param {function(): void} onMove - Callback after each drag move
 */
export function setupOverlayDrag(previewOverlay, previewContainer, overlayPosition, onMove) {
  let dragging = false;

  previewOverlay.addEventListener('mousedown', (e) => {
    if (overlayPosition.value !== 'custom') return;
    dragging = true;
    previewOverlay.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = previewContainer.getBoundingClientRect();
    state.customOverlayX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    state.customOverlayY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onMove();
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      previewOverlay.classList.remove('dragging');
    }
  });
}
