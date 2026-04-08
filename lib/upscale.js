/**
 * VideoRender — Image upscaler
 * Upscales images using FFmpeg's scaling filters.
 * @author TxTony
 */

const fs = require('fs');
const { spawn } = require('child_process');

let currentProc = null;

/**
 * Cancel the currently running upscale.
 */
function cancelUpscale() {
  if (currentProc) {
    currentProc.kill();
    currentProc = null;
  }
}

/**
 * Probe image dimensions using FFprobe.
 * @param {string} ffprobePath
 * @param {string} filePath
 * @returns {Promise<{width: number, height: number}>}
 */
function probeImageSize(ffprobePath, filePath) {
  return new Promise((resolve) => {
    const proc = spawn(ffprobePath, [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'json',
      filePath
    ]);
    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.on('close', () => {
      try {
        const parsed = JSON.parse(output);
        const s = parsed.streams && parsed.streams[0];
        resolve({ width: s ? s.width : 0, height: s ? s.height : 0 });
      } catch {
        resolve({ width: 0, height: 0 });
      }
    });
    proc.on('error', () => resolve({ width: 0, height: 0 }));
  });
}

/**
 * Upscale an image using FFmpeg.
 * @param {Object} opts
 * @param {string} opts.inputPath
 * @param {string} opts.outputPath
 * @param {string} opts.mode - "2x", "4x", or "custom"
 * @param {number} [opts.customWidth] - Target width for custom mode
 * @param {number} [opts.customHeight] - Target height for custom mode
 * @param {string} [opts.algorithm] - Scaling algorithm (lanczos, bicubic, bilinear, spline)
 * @param {Object} context
 * @param {string} context.ffmpegPath
 * @param {string} context.ffprobePath
 * @returns {Promise<Object>} { success, output?, error?, outputWidth?, outputHeight? }
 */
async function upscaleImage(opts, { ffmpegPath, ffprobePath }) {
  const { inputPath, outputPath, mode, customWidth, customHeight, algorithm } = opts;

  if (!fs.existsSync(inputPath)) {
    return { success: false, error: `Image not found: ${inputPath}` };
  }

  const src = await probeImageSize(ffprobePath, inputPath);
  if (!src.width || !src.height) {
    return { success: false, error: 'Could not read image dimensions.' };
  }

  let targetW, targetH;
  if (mode === '2x') {
    targetW = src.width * 2;
    targetH = src.height * 2;
  } else if (mode === '4x') {
    targetW = src.width * 4;
    targetH = src.height * 4;
  } else {
    targetW = customWidth || src.width * 2;
    targetH = customHeight || src.height * 2;
  }

  // Ensure even dimensions
  targetW = Math.round(targetW / 2) * 2;
  targetH = Math.round(targetH / 2) * 2;

  const flagsMap = {
    lanczos:  'lanczos',
    bicubic:  'bicubic',
    bilinear: 'bilinear',
    spline:   'spline16',
  };
  const flags = flagsMap[algorithm] || 'lanczos';

  const args = [
    '-y', '-i', inputPath,
    '-vf', `scale=${targetW}:${targetH}:flags=${flags}`,
    '-frames:v', '1',
    outputPath
  ];

  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, args);
    let stderr = '';

    proc.stderr.on('data', (d) => {
      stderr = (stderr + d.toString()).slice(-2000);
    });

    proc.on('close', (code, signal) => {
      currentProc = null;
      if (signal === 'SIGTERM') {
        resolve({ success: false, cancelled: true });
      } else if (code === 0) {
        resolve({ success: true, output: outputPath, outputWidth: targetW, outputHeight: targetH });
      } else {
        resolve({ success: false, error: stderr.slice(-500) });
      }
    });

    proc.on('error', (err) => {
      currentProc = null;
      resolve({ success: false, error: `Failed to start FFmpeg: ${err.message}` });
    });

    currentProc = proc;
  });
}

module.exports = { upscaleImage, cancelUpscale, probeImageSize };
