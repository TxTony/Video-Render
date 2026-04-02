/**
 * VideoRender — Render orchestration
 * Validates inputs, probes audio duration, builds FFmpeg args, and runs the render.
 * @author TxTony
 */

const fs = require('fs');
const { probeMediaDuration } = require('./ffmpeg');
const { buildRenderArgs } = require('./args');

let currentProc = null;

/**
 * Cancel the currently running render by killing the FFmpeg process.
 * Safe to call even if no render is running.
 */
function cancelRender() {
  if (currentProc) {
    currentProc.kill();
    currentProc = null;
  }
}

/**
 * Execute a full render job: validate files, probe duration, build args, run FFmpeg.
 * @param {Object} opts - Render options from the UI (visual, audio, overlay, effects, metadata, output settings)
 * @param {string} opts.visualPath - Path to the source image or video
 * @param {string} opts.audioPath - Path to the audio file
 * @param {string} opts.outputPath - Path for the output MP4
 * @param {string} [opts.overlayPath] - Path to overlay PNG, or null
 * @param {number} [opts.endPadding=2] - Extra seconds after audio ends
 * @param {Object} context
 * @param {string} context.ffmpegPath - Resolved path to ffmpeg binary
 * @param {string} context.ffprobePath - Resolved path to ffprobe binary
 * @param {function(number): void} context.onProgress - Called with elapsed seconds during encoding
 * @returns {Promise<Object>} Result: { success: true, output } or { success: false, error? , cancelled? }
 */
async function render(opts, { ffmpegPath, ffprobePath, onProgress }) {
  const { visualPath, audioPath, overlayPath, outputPath, endPadding } = opts;

  if (!fs.existsSync(visualPath)) return { success: false, error: `Visual not found: ${visualPath}` };
  if (!fs.existsSync(audioPath)) return { success: false, error: `Audio not found: ${audioPath}` };
  if (overlayPath && !fs.existsSync(overlayPath)) return { success: false, error: `Overlay not found: ${overlayPath}` };

  const audioDuration = await probeMediaDuration(ffprobePath, audioPath);
  const totalDuration = audioDuration > 0 ? audioDuration + (endPadding || 2) : 0;

  const args = buildRenderArgs(opts, totalDuration);

  const { runFFmpeg } = require('./ffmpeg');

  return new Promise((resolve) => {
    const proc = runFFmpeg(ffmpegPath, args, {
      onProgress,
      onDone: (result) => {
        currentProc = null;
        if (result.success) {
          resolve({ success: true, output: outputPath });
        } else {
          resolve(result);
        }
      }
    });
    currentProc = proc;
  });
}

module.exports = { render, cancelRender };
