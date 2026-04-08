/**
 * VideoRender — Image Upscaler module
 * Handles the image upscale tab UI logic.
 * @author TxTony
 */

import { setupDropZone } from './dropzones.js';

/**
 * Set up the image upscaler tab.
 */
export function setupUpscaler() {
  const els = {
    sourceZone:     document.getElementById('upscaleSourceZone'),
    sourceInput:    document.getElementById('upscaleSourceInput'),
    thumb:          document.getElementById('upscaleThumb'),
    sourceInfo:     document.getElementById('upscaleSourceInfo'),
    fileName:       document.getElementById('upscaleFileName'),
    fileDims:       document.getElementById('upscaleFileDims'),
    arrow:          document.getElementById('upscaleArrow'),
    settings:       document.getElementById('upscaleSettings'),
    mode:           document.getElementById('upscaleMode'),
    algorithm:      document.getElementById('upscaleAlgorithm'),
    customSize:     document.getElementById('upscaleCustomSize'),
    widthInput:     document.getElementById('upscaleWidth'),
    heightInput:    document.getElementById('upscaleHeight'),
    outputPreview:  document.getElementById('upscaleOutputPreview'),
    outputDims:     document.getElementById('upscaleOutputDims'),
    upscaleBtn:     document.getElementById('upscaleBtn'),
    progressArea:   document.getElementById('upscaleProgressArea'),
    progressFill:   document.getElementById('upscaleProgressFill'),
    progressText:   document.getElementById('upscaleProgressText'),
    result:         document.getElementById('upscaleResult'),
  };

  let sourcePath = null;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let blobUrl = null;

  function updateOutputPreview() {
    if (!sourceWidth || !sourceHeight) {
      els.outputPreview.style.display = 'none';
      return;
    }

    const mode = els.mode.value;
    let w, h;

    if (mode === '2x') {
      w = sourceWidth * 2;
      h = sourceHeight * 2;
    } else if (mode === '4x') {
      w = sourceWidth * 4;
      h = sourceHeight * 4;
    } else {
      w = parseInt(els.widthInput.value, 10) || 0;
      h = parseInt(els.heightInput.value, 10) || 0;
    }

    if (w > 0 && h > 0) {
      els.outputDims.textContent = `${w} x ${h} px`;
      els.outputPreview.style.display = 'block';
    } else {
      els.outputPreview.style.display = 'none';
    }
  }

  function updateModeUI() {
    const isCustom = els.mode.value === 'custom';
    els.customSize.style.display = isCustom ? 'grid' : 'none';

    if (isCustom && sourceWidth && sourceHeight) {
      if (!els.widthInput.value) els.widthInput.value = sourceWidth * 2;
      if (!els.heightInput.value) els.heightInput.value = sourceHeight * 2;
    }
    updateOutputPreview();
  }

  els.mode.addEventListener('change', updateModeUI);
  els.widthInput.addEventListener('input', updateOutputPreview);
  els.heightInput.addEventListener('input', updateOutputPreview);

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
    sourceWidth = size.width;
    sourceHeight = size.height;

    els.fileName.textContent = file.name;
    els.fileDims.textContent = sourceWidth && sourceHeight
      ? `${sourceWidth} x ${sourceHeight} px`
      : 'unknown';

    els.sourceInfo.style.display = 'block';
    els.arrow.style.display = 'block';
    els.settings.style.display = 'block';
    els.upscaleBtn.disabled = false;
    els.result.style.display = 'none';

    // Reset custom fields for new image
    els.widthInput.value = '';
    els.heightInput.value = '';
    updateModeUI();
  });

  // Upscale button
  els.upscaleBtn.addEventListener('click', async () => {
    if (!sourcePath) return;

    const outputPath = await window.api.pickUpscaleOutput('png');
    if (!outputPath) return;

    els.upscaleBtn.disabled = true;
    els.upscaleBtn.textContent = 'Upscaling...';
    els.progressArea.style.display = 'block';
    els.progressFill.style.width = '50%';
    els.progressText.textContent = 'Upscaling...';
    els.result.style.display = 'none';

    const result = await window.api.upscaleImage({
      inputPath: sourcePath,
      outputPath,
      mode: els.mode.value,
      customWidth: parseInt(els.widthInput.value, 10) || 0,
      customHeight: parseInt(els.heightInput.value, 10) || 0,
      algorithm: els.algorithm.value,
    });

    els.upscaleBtn.disabled = false;
    els.upscaleBtn.textContent = 'Upscale Image';

    if (result.success) {
      els.progressFill.style.width = '100%';
      els.result.className = 'result success';
      els.result.textContent = `Done! ${result.outputWidth} x ${result.outputHeight} px → ${result.output}`;
    } else if (result.cancelled) {
      els.result.className = 'result error';
      els.result.textContent = 'Upscale cancelled.';
    } else {
      els.result.className = 'result error';
      els.result.textContent = result.error || 'Upscale failed.';
    }
    els.result.style.display = 'block';
  });
}
