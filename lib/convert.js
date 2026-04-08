/**
 * VideoRender — Audio conversion
 * Converts audio files between formats using FFmpeg.
 * @author TxTony
 */

const fs = require('fs');
const { runFFmpeg } = require('./ffmpeg');

let currentProc = null;

/**
 * Cancel the currently running audio conversion.
 */
function cancelConvert() {
  if (currentProc) {
    currentProc.kill();
    currentProc = null;
  }
}

/**
 * Audio format codec and argument mappings.
 */
const FORMAT_ARGS = {
  mp3:  (quality) => ['-codec:a', 'libmp3lame',  '-b:a', `${quality}k`],
  wav:  ()        => ['-codec:a', 'pcm_s16le'],
  flac: ()        => ['-codec:a', 'flac'],
  ogg:  (quality) => ['-codec:a', 'libvorbis',   '-b:a', `${quality}k`],
  aac:  (quality) => ['-codec:a', 'aac',          '-b:a', `${quality}k`],
  wma:  (quality) => ['-codec:a', 'wmav2',        '-b:a', `${quality}k`],
};

/**
 * Build FFmpeg arguments for audio conversion.
 * @param {Object} opts
 * @param {string} opts.inputPath - Source audio file
 * @param {string} opts.outputPath - Destination file
 * @param {string} opts.format - Target format (mp3, wav, flac, ogg, aac, wma)
 * @param {number} opts.bitrate - Target bitrate in kbps (ignored for lossless)
 * @param {number} [opts.sampleRate] - Sample rate in Hz (0 = keep original)
 * @param {number} [opts.channels] - Number of channels (0 = keep original)
 * @returns {string[]}
 */
function buildConvertArgs(opts) {
  const { inputPath, outputPath, format, bitrate, sampleRate, channels } = opts;

  const args = ['-y', '-i', inputPath];

  // Strip video streams (album art, etc.)
  args.push('-vn');

  // Format-specific codec args
  const formatFn = FORMAT_ARGS[format];
  if (formatFn) {
    args.push(...formatFn(bitrate));
  }

  // Optional sample rate
  if (sampleRate && sampleRate > 0) {
    args.push('-ar', String(sampleRate));
  }

  // Optional channel count
  if (channels && channels > 0) {
    args.push('-ac', String(channels));
  }

  args.push(outputPath);
  return args;
}

/**
 * Convert an audio file to a different format.
 * @param {Object} opts - Conversion options
 * @param {string} opts.inputPath - Source audio file path
 * @param {string} opts.outputPath - Destination file path
 * @param {string} opts.format - Target format key
 * @param {number} opts.bitrate - Bitrate in kbps
 * @param {number} [opts.sampleRate] - Sample rate in Hz
 * @param {number} [opts.channels] - Channel count
 * @param {Object} context
 * @param {string} context.ffmpegPath - Path to ffmpeg binary
 * @param {function(number): void} context.onProgress - Progress callback (seconds processed)
 * @returns {Promise<Object>} { success, output?, error?, cancelled? }
 */
async function convertAudio(opts, { ffmpegPath, onProgress }) {
  const { inputPath, outputPath } = opts;

  if (!fs.existsSync(inputPath)) {
    return { success: false, error: `Source not found: ${inputPath}` };
  }

  const args = buildConvertArgs(opts);

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

module.exports = { convertAudio, cancelConvert };
