/**
 * VideoRender — FFmpeg interface
 * Handles FFmpeg/FFprobe binary resolution, media probing, and process execution.
 * @author TxTony
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

/**
 * Resolve the path to the FFmpeg binary.
 * Checks bundled (packaged app), dev location, then falls back to system PATH.
 * @param {string} appDir - The application root directory (__dirname)
 * @returns {string} Absolute path to ffmpeg binary, or 'ffmpeg' if not found
 */
function resolveFFmpegPath(appDir) {
  const platform = os.platform();
  const ext = platform === 'win32' ? '.exe' : '';

  const bundled = path.join(process.resourcesPath || '', 'ffmpeg', `ffmpeg${ext}`);
  if (fs.existsSync(bundled)) return bundled;

  const devWin = path.join(appDir, '..', 'ffmpeg-master-latest-win64-gpl-shared',
    'ffmpeg-master-latest-win64-gpl-shared', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(devWin)) return devWin;

  return 'ffmpeg';
}

/**
 * Resolve the path to the FFprobe binary.
 * Checks bundled (packaged app), dev location, then falls back to system PATH.
 * @param {string} appDir - The application root directory (__dirname)
 * @returns {string} Absolute path to ffprobe binary, or 'ffprobe' if not found
 */
function resolveFFprobePath(appDir) {
  const platform = os.platform();
  const ext = platform === 'win32' ? '.exe' : '';

  const bundled = path.join(process.resourcesPath || '', 'ffmpeg', `ffprobe${ext}`);
  if (fs.existsSync(bundled)) return bundled;

  const devWin = path.join(appDir, '..', 'ffmpeg-master-latest-win64-gpl-shared',
    'ffmpeg-master-latest-win64-gpl-shared', 'bin', 'ffprobe.exe');
  if (fs.existsSync(devWin)) return devWin;

  return 'ffprobe';
}

/**
 * Probe the duration of a media file using FFprobe.
 * @param {string} ffprobePath - Path to the ffprobe binary
 * @param {string} filePath - Path to the media file to probe
 * @returns {Promise<number>} Duration in seconds, or 0 on failure
 */
function probeMediaDuration(ffprobePath, filePath) {
  return new Promise((resolve) => {
    const proc = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);
    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.on('close', () => {
      const dur = parseFloat(output.trim());
      resolve(isNaN(dur) ? 0 : dur);
    });
    proc.on('error', () => resolve(0));
  });
}

/**
 * Probe metadata tags from a media file using FFprobe.
 * @param {string} ffprobePath - Path to the ffprobe binary
 * @param {string} filePath - Path to the media file to probe
 * @returns {Promise<Object>} Object with lowercase tag keys (title, artist, album, genre, date, comment, description). Empty object on failure.
 */
function probeMediaMetadata(ffprobePath, filePath) {
  return new Promise((resolve) => {
    const proc = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format_tags=title,artist,album,album_artist,genre,date,comment,description',
      '-of', 'json',
      filePath
    ]);
    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.on('close', () => {
      try {
        const parsed = JSON.parse(output);
        const tags = parsed.format && parsed.format.tags ? parsed.format.tags : {};
        const result = {};
        for (const [k, v] of Object.entries(tags)) {
          result[k.toLowerCase()] = v;
        }
        resolve(result);
      } catch {
        resolve({});
      }
    });
    proc.on('error', () => resolve({}));
  });
}

/**
 * Spawn an FFmpeg process with the given arguments.
 * Parses progress from stderr and reports via callbacks. Caps stderr buffer at 2000 chars.
 * @param {string} ffmpegPath - Path to the ffmpeg binary
 * @param {string[]} args - Array of FFmpeg command-line arguments
 * @param {Object} callbacks
 * @param {function(number): void} callbacks.onProgress - Called with elapsed seconds as FFmpeg encodes
 * @param {function(Object): void} callbacks.onDone - Called with result: { success, output?, error?, cancelled? }
 * @returns {ChildProcess} The spawned FFmpeg process (can be killed to cancel)
 */
function runFFmpeg(ffmpegPath, args, { onProgress, onDone }) {
  const proc = spawn(ffmpegPath, args);
  let stderr = '';

  proc.stderr.on('data', (data) => {
    stderr = (stderr + data.toString()).slice(-2000);
    const timeMatch = data.toString().match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (timeMatch && onProgress) {
      const seconds = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseFloat(timeMatch[3]);
      onProgress(seconds);
    }
  });

  proc.on('close', (code, signal) => {
    if (signal === 'SIGTERM') {
      onDone({ success: false, cancelled: true });
    } else if (code === 0) {
      onDone({ success: true });
    } else {
      onDone({ success: false, error: stderr.slice(-500) });
    }
  });

  proc.on('error', (err) => {
    onDone({ success: false, error: `Failed to start FFmpeg: ${err.message}` });
  });

  return proc;
}

module.exports = {
  resolveFFmpegPath,
  resolveFFprobePath,
  probeMediaDuration,
  probeMediaMetadata,
  runFFmpeg
};
