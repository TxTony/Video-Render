/**
 * VideoRender — Drag & drop zone setup
 * Generic drop zone handler for files with click-to-browse fallback.
 * @author TxTony
 */

/**
 * Set up a drop zone with drag events and click-to-browse.
 * @param {HTMLElement} zone - The drop zone container element
 * @param {HTMLInputElement} input - The hidden file input element
 * @param {function(File): void} onFile - Callback when a file is dropped or selected
 */
export function setupDropZone(zone, input, onFile) {
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length > 0) onFile(input.files[0]);
  });
  zone.addEventListener('dragenter', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  });
}
