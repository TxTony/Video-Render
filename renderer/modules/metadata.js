/**
 * VideoRender — Metadata auto-fill
 * Probes audio/video files for metadata and fills form fields.
 * @author TxTony
 */

/**
 * Auto-fill a text input if it's empty and a value is available.
 * Adds 'auto-filled' class for visual indication.
 * @param {HTMLInputElement} input - The text input to fill
 * @param {string} [value] - The value to set
 */
function autoFillField(input, value) {
  if (value && !input.value) {
    input.value = value;
    input.classList.add('auto-filled');
  }
}

/**
 * Probe a file for metadata via the main process and fill the form fields.
 * @param {string} filePath - Path to the media file
 * @param {Object} els - DOM elements: { metaTitle, metaArtist, metaAlbum, metaGenre, metaDate, metaComment }
 */
export async function probeAndFillMetadata(filePath, els) {
  const tags = await window.api.probeMetadata(filePath);
  if (!tags) return;
  autoFillField(els.metaTitle, tags.title);
  autoFillField(els.metaArtist, tags.artist || tags.album_artist);
  autoFillField(els.metaAlbum, tags.album);
  autoFillField(els.metaGenre, tags.genre);
  autoFillField(els.metaDate, tags.date);
  autoFillField(els.metaComment, tags.comment || tags.description);
}

/**
 * Set up auto-filled highlight removal on manual edit for all metadata inputs.
 * @param {Object} els - DOM elements: { metaTitle, metaArtist, metaAlbum, metaGenre, metaDate, metaComment }
 */
export function setupMetadataInputs(els) {
  [els.metaTitle, els.metaArtist, els.metaAlbum, els.metaGenre, els.metaDate, els.metaComment].forEach(input => {
    input.addEventListener('input', () => input.classList.remove('auto-filled'));
  });
}
