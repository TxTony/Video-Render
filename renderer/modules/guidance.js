/**
 * VideoRender — Step guidance banner
 * Updates the guidance message based on current app state.
 * @author TxTony
 */

import state from './state.js';

/**
 * Update the guidance banner text and style based on loaded files.
 * @param {HTMLElement} el - The guidance banner element
 */
export function updateGuidance(el) {
  if (!state.visualPath && !state.audioPath) {
    el.textContent = 'Start by dropping your image or video above';
    el.className = 'guidance';
  } else if (state.visualPath && !state.audioPath) {
    el.textContent = 'Got it! Now drop your song on the right';
    el.className = 'guidance';
  } else if (!state.visualPath && state.audioPath) {
    el.textContent = 'Now drop your image or video on the left';
    el.className = 'guidance';
  } else {
    el.textContent = 'Ready! Choose your output format below, then click "Create Video"';
    el.className = 'guidance done';
  }
}
