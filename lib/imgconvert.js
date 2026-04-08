/**
 * VideoRender — Image format conversion
 * Converts images between formats using FFmpeg.
 * @author TxTony
 */

const fs = require('fs');
const { spawn } = require('child_process');

let currentProc = null;

function cancelImgConvert() {
  if (currentProc) {
    currentProc.kill();
    currentProc = null;
  }
}

/**
 * Quality arguments per output format.
 */
const FORMAT_ARGS = {
  png:  (q) => ['-compression_level', String(Math.round((100 - q) / 10))],
  jpg:  (q) => ['-q:v', String(Math.round(2 + (100 - q) * 29 / 100))],
  jpeg: (q) => ['-q:v', String(Math.round(2 + (100 - q) * 29 / 100))],
  webp: (q) => ['-quality', String(q)],
  bmp:  ()  => [],
  tiff: ()  => [],
  ico:  ()  => [],
};

/**
 * Convert an image to a different format.
 * @param {Object} opts
 * @param {string} opts.inputPath
 * @param {string} opts.outputPath
 * @param {string} opts.format - Target format (png, jpg, webp, bmp, tiff, ico)
 * @param {number} [opts.quality=90] - Quality 1-100 (for lossy formats)
 * @param {Object} context
 * @param {string} context.ffmpegPath
 * @returns {Promise<Object>} { success, output?, error?, cancelled? }
 */
async function convertImage(opts, { ffmpegPath }) {
  const { inputPath, outputPath, format, quality = 90 } = opts;

  if (!fs.existsSync(inputPath)) {
    return { success: false, error: `Image not found: ${inputPath}` };
  }

  const args = ['-y', '-i', inputPath];

  const formatFn = FORMAT_ARGS[format];
  if (formatFn) {
    args.push(...formatFn(quality));
  }

  args.push('-frames:v', '1', outputPath);

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
        resolve({ success: true, output: outputPath });
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

module.exports = { convertImage, cancelImgConvert };
