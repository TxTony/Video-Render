/**
 * VideoRender — Image Converter module
 * Handles the image conversion tab UI logic.
 * @author TxTony
 */

import { setupDropZone } from './dropzones.js';

const LOSSLESS_FORMATS = ['bmp', 'tiff', 'ico'];

/**
 * Set up the image converter tab.
 */
export function setupImgConverter() {
  const els = {
    sourceZone:     document.getElementById('imgConvertSourceZone'),
    sourceInput:    document.getElementById('imgConvertSourceInput'),
    thumb:          document.getElementById('imgConvertThumb'),
    sourceInfo:     document.getElementById('imgConvertSourceInfo'),
    fileName:       document.getElementById('imgConvertFileName'),
    fileDims:       document.getElementById('imgConvertFileDims'),
    arrow:          document.getElementById('imgConvertArrow'),
    settings:       document.getElementById('imgConvertSettings'),
    format:         document.getElementById('imgConvertFormat'),
    qualitySetting: document.getElementById('imgConvertQualitySetting'),
    quality:        document.getElementById('imgConvertQuality'),
    qualityVal:     document.getElementById('imgConvertQualityVal'),
    convertBtn:     document.getElementById('imgConvertBtn'),
    progressArea:   document.getElementById('imgConvertProgressArea'),
    progressFill:   document.getElementById('imgConvertProgressFill'),
    progressText:   document.getElementById('imgConvertProgressText'),
    result:         document.getElementById('imgConvertResult'),
  };

  let sourcePath = null;
  let blobUrl = null;

  function updateFormatUI() {
    const isLossless = LOSSLESS_FORMATS.includes(els.format.value);
    els.qualitySetting.style.display = isLossless ? 'none' : 'flex';
  }

  els.format.addEventListener('change', updateFormatUI);
  els.quality.addEventListener('input', () => {
    els.qualityVal.textContent = els.quality.value;
  });
  updateFormatUI();

  // Drop zone
  setupDropZone(els.sourceZone, els.sourceInput, async (file) => {
    sourcePath = window.api.getFilePath(file);

    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(file);
    els.thumb.src = blobUrl;
    els.thumb.style.display = 'block';

    els.sourceZone.classList.add('has-file');
    els.sourceZone.querySelector('.drop-zone-icon').style.display = 'none';
    els.sourceZone.querySelector('.drop-zone-label').style.display = 'none';
    els.sourceZone.querySelector('.drop-zone-hint').style.display = 'none';

    // Probe dimensions
    const size = await window.api.probeImageSize(sourcePath);
    els.fileName.textContent = file.name;
    els.fileDims.textContent = size.width && size.height
      ? `${size.width} x ${size.height} px`
      : 'unknown';

    els.sourceInfo.style.display = 'block';
    els.arrow.style.display = 'block';
    els.settings.style.display = 'block';
    els.convertBtn.disabled = false;
    els.result.style.display = 'none';
  });

  // Convert button
  els.convertBtn.addEventListener('click', async () => {
    if (!sourcePath) return;

    const format = els.format.value;
    const outputPath = await window.api.pickImgConvertOutput(format);
    if (!outputPath) return;

    els.convertBtn.disabled = true;
    els.convertBtn.textContent = 'Converting...';
    els.progressArea.style.display = 'block';
    els.progressFill.style.width = '50%';
    els.progressText.textContent = 'Converting...';
    els.result.style.display = 'none';

    const result = await window.api.convertImage({
      inputPath: sourcePath,
      outputPath,
      format,
      quality: parseInt(els.quality.value, 10),
    });

    els.convertBtn.disabled = false;
    els.convertBtn.textContent = 'Convert Image';

    if (result.success) {
      els.progressFill.style.width = '100%';
      els.result.className = 'result success';
      els.result.textContent = `Done! Saved to ${result.output}`;
    } else if (result.cancelled) {
      els.result.className = 'result error';
      els.result.textContent = 'Conversion cancelled.';
    } else {
      els.result.className = 'result error';
      els.result.textContent = result.error || 'Conversion failed.';
    }
    els.result.style.display = 'block';
  });
}
