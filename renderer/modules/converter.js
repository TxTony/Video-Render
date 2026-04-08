/**
 * VideoRender — Audio Converter module
 * Handles the audio conversion tab UI logic.
 * @author TxTony
 */

import { setupDropZone } from './dropzones.js';

const LOSSLESS_FORMATS = ['wav', 'flac'];

/**
 * Format seconds as m:ss.
 */
function formatDuration(sec) {
  if (!sec || sec <= 0) return '-';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Set up the audio converter tab.
 */
export function setupConverter() {
  const els = {
    sourceZone:      document.getElementById('convertSourceZone'),
    sourceInput:     document.getElementById('convertSourceInput'),
    sourceName:      document.getElementById('convertSourceName'),
    sourceInfo:      document.getElementById('convertSourceInfo'),
    fileName:        document.getElementById('convertFileName'),
    fileDuration:    document.getElementById('convertFileDuration'),
    arrow:           document.getElementById('convertArrow'),
    settings:        document.getElementById('convertSettings'),
    format:          document.getElementById('convertFormat'),
    bitrate:         document.getElementById('convertBitrate'),
    bitrateSetting:  document.getElementById('convertBitrateSetting'),
    sampleRate:      document.getElementById('convertSampleRate'),
    channels:        document.getElementById('convertChannels'),
    convertBtn:      document.getElementById('convertBtn'),
    progressArea:    document.getElementById('convertProgressArea'),
    progressFill:    document.getElementById('convertProgressFill'),
    progressText:    document.getElementById('convertProgressText'),
    result:          document.getElementById('convertResult'),
  };

  let sourcePath = null;
  let sourceDuration = 0;
  let isConverting = false;

  // Toggle bitrate visibility for lossless formats
  function updateFormatUI() {
    const isLossless = LOSSLESS_FORMATS.includes(els.format.value);
    els.bitrateSetting.style.display = isLossless ? 'none' : 'flex';
  }

  els.format.addEventListener('change', updateFormatUI);
  updateFormatUI();

  // Drop zone for source audio
  setupDropZone(els.sourceZone, els.sourceInput, async (file) => {
    sourcePath = window.api.getFilePath(file);

    els.sourceZone.classList.add('has-file');
    els.sourceName.textContent = file.name;
    els.sourceName.style.display = 'block';
    els.sourceZone.querySelector('.drop-zone-icon').textContent = '✅';
    els.sourceZone.querySelector('.drop-zone-label').textContent = file.name;
    els.sourceZone.querySelector('.drop-zone-hint').style.display = 'none';

    // Probe duration
    sourceDuration = await window.api.probeDuration(sourcePath);
    els.fileName.textContent = file.name;
    els.fileDuration.textContent = formatDuration(sourceDuration);

    els.sourceInfo.style.display = 'block';
    els.arrow.style.display = 'block';
    els.settings.style.display = 'block';
    els.convertBtn.disabled = false;
    els.result.style.display = 'none';
  });

  // Convert button
  els.convertBtn.addEventListener('click', async () => {
    if (!sourcePath || isConverting) return;

    const format = els.format.value;
    const outputPath = await window.api.pickConvertOutput(format);
    if (!outputPath) return;

    isConverting = true;
    els.convertBtn.disabled = true;
    els.convertBtn.textContent = 'Cancel';
    els.convertBtn.disabled = false;
    els.progressArea.style.display = 'block';
    els.progressFill.style.width = '0%';
    els.progressText.textContent = 'Converting...';
    els.result.style.display = 'none';

    // Allow cancel
    const cancelHandler = () => {
      if (isConverting) {
        window.api.cancelConvert();
      }
    };
    els.convertBtn.addEventListener('click', cancelHandler, { once: true });

    const result = await window.api.convertAudio({
      inputPath: sourcePath,
      outputPath,
      format,
      bitrate: parseInt(els.bitrate.value, 10),
      sampleRate: parseInt(els.sampleRate.value, 10),
      channels: parseInt(els.channels.value, 10),
    });

    els.convertBtn.removeEventListener('click', cancelHandler);
    isConverting = false;
    els.convertBtn.textContent = 'Convert Audio';
    els.convertBtn.disabled = !sourcePath;

    if (result.success) {
      els.result.className = 'result success';
      els.result.textContent = `Done! Saved to ${result.output}`;
      els.progressFill.style.width = '100%';
    } else if (result.cancelled) {
      els.result.className = 'result error';
      els.result.textContent = 'Conversion cancelled.';
    } else {
      els.result.className = 'result error';
      els.result.textContent = result.error || 'Conversion failed.';
    }
    els.result.style.display = 'block';
  });

  // Progress updates
  window.api.onConvertProgress((data) => {
    const pct = sourceDuration > 0 ? Math.min(100, (data.seconds / sourceDuration) * 100) : 0;
    els.progressFill.style.width = pct + '%';
    els.progressText.textContent = `Converting... ${Math.floor(data.seconds)}s / ${formatDuration(sourceDuration)}`;
  });
}
