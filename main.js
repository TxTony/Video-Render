const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;

function getFFmpegPath() {
  // Check bundled ffmpeg first (for packaged app)
  const platform = os.platform();
  const ext = platform === 'win32' ? '.exe' : '';
  const bundled = path.join(process.resourcesPath || '', 'ffmpeg', `ffmpeg${ext}`);
  if (fs.existsSync(bundled)) return bundled;

  // Check common Windows location (dev mode)
  const devWin = path.join(__dirname, '..', 'ffmpeg-master-latest-win64-gpl-shared',
    'ffmpeg-master-latest-win64-gpl-shared', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(devWin)) return devWin;

  // Fallback to system ffmpeg
  return 'ffmpeg';
}

function getFFprobePath() {
  const platform = os.platform();
  const ext = platform === 'win32' ? '.exe' : '';
  const bundled = path.join(process.resourcesPath || '', 'ffmpeg', `ffprobe${ext}`);
  if (fs.existsSync(bundled)) return bundled;

  const devWin = path.join(__dirname, '..', 'ffmpeg-master-latest-win64-gpl-shared',
    'ffmpeg-master-latest-win64-gpl-shared', 'bin', 'ffprobe.exe');
  if (fs.existsSync(devWin)) return devWin;

  return 'ffprobe';
}

function getMediaDuration(filePath) {
  return new Promise((resolve) => {
    const ffprobe = getFFprobePath();
    const proc = spawn(ffprobe, [
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

function getMediaMetadata(filePath) {
  return new Promise((resolve) => {
    const ffprobe = getFFprobePath();
    const proc = spawn(ffprobe, [
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
        // Normalize keys to lowercase
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1150,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'default',
    title: 'VideoRender'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  // Auto-update: check for updates silently
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update-status', 'Downloading update...');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-status', 'Update ready — will install on restart');
  });

  autoUpdater.on('error', () => {
    // Silently ignore update errors
  });

  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
});

app.on('window-all-closed', () => app.quit());

// Handle file dialog for output path
// Probe metadata from a file
ipcMain.handle('probe-metadata', async (event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return {};
  return getMediaMetadata(filePath);
});

ipcMain.handle('pick-output', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save video as',
    defaultPath: 'output.mp4',
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
  });
  return result.canceled ? null : result.filePath;
});

// Handle render
ipcMain.handle('render', async (event, opts) => {
  const { visualPath, visualType, audioPath, outputPath, resolution, audioBitrate,
          videoBitrate, crf, grain, contrast, brightness, endPadding,
          overlayPath, overlayPosition, overlayCustomX, overlayCustomY, overlaySize, overlayOpacity,
          overlayStart, overlayDuration, overlayTransition,
          metaTitle, metaArtist, metaAlbum, metaGenre, metaDate, metaComment } = opts;

  // Validate inputs exist
  if (!fs.existsSync(visualPath)) return { success: false, error: `Visual not found: ${visualPath}` };
  if (!fs.existsSync(audioPath)) return { success: false, error: `Audio not found: ${audioPath}` };

  // Get audio duration to enforce exact output length
  const audioDuration = await getMediaDuration(audioPath);
  const totalDuration = audioDuration > 0 ? audioDuration + (endPadding || 2) : 0;
  if (overlayPath && !fs.existsSync(overlayPath)) return { success: false, error: `Overlay not found: ${overlayPath}` };

  // Build metadata args
  const metaArgs = [];
  if (metaTitle) metaArgs.push('-metadata', `title=${metaTitle}`);
  if (metaArtist) metaArgs.push('-metadata', `artist=${metaArtist}`);
  if (metaAlbum) metaArgs.push('-metadata', `album=${metaAlbum}`);
  if (metaGenre) metaArgs.push('-metadata', `genre=${metaGenre}`);
  if (metaDate) metaArgs.push('-metadata', `date=${metaDate}`);
  if (metaComment) metaArgs.push('-metadata', `comment=${metaComment}`);

  const ffmpeg = getFFmpegPath();
  const [width, height] = resolution.split('x');
  const w = parseInt(width);
  const h = parseInt(height);

  const hasOverlay = !!overlayPath;

  // Scale that preserves aspect ratio: fit inside WxH, pad with black
  const scaleFilter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black`;

  // Video encoding args: CRF mode or bitrate mode
  // When grain is high, bump CRF to avoid encoding noise at full quality
  // (noise is random detail the encoder wastes bits on)
  const grainCrfBump = grain > 20 ? Math.round((grain - 20) * 0.3) : 0;
  const effectiveCrf = Math.min(crf + grainCrfBump, 40);

  function videoEncArgs(tune) {
    const enc = ['-c:v', 'libx264'];
    if (tune) enc.push('-tune', tune);
    if (videoBitrate > 0) {
      enc.push('-b:v', `${videoBitrate}k`, '-maxrate', `${videoBitrate}k`, '-bufsize', `${videoBitrate * 2}k`);
    } else {
      enc.push('-crf', `${effectiveCrf}`);
    }
    enc.push('-pix_fmt', 'yuv420p');
    return enc;
  }

  function getOverlayXY(pos) {
    const pad = 20;
    switch (pos) {
      case 'center':       return `x=(W-w)/2:y=(H-h)/2`;
      case 'top-left':     return `x=${pad}:y=${pad}`;
      case 'top-right':    return `x=W-w-${pad}:y=${pad}`;
      case 'bottom-left':  return `x=${pad}:y=H-h-${pad}`;
      case 'bottom-right': return `x=W-w-${pad}:y=H-h-${pad}`;
      case 'custom': {
        // Convert percentage to pixel position, centered on the overlay
        const px = Math.round(w * (overlayCustomX || 50) / 100);
        const py = Math.round(h * (overlayCustomY || 50) / 100);
        return `x=${px}-w/2:y=${py}-h/2`;
      }
      default:             return `x=(W-w)/2:y=(H-h)/2`;
    }
  }

  let args;

  if (hasOverlay) {
    const overlayW = Math.round(w * overlaySize / 100);
    const xy = getOverlayXY(overlayPosition);
    const tStart = overlayStart || 0;
    const tDur = overlayDuration || 5;
    const tEnd = tStart + tDur;

    // Fade durations based on transition type
    let fadeIn = 0, fadeOut = 0;
    if (overlayTransition === 'fade') { fadeIn = 0.5; fadeOut = 0.5; }
    else if (overlayTransition === 'fade-long') { fadeIn = 1.5; fadeOut = 1.5; }

    const vidIdx = 0;
    const audioIdx = 1;
    const ovIdx = 2;

    // Scale base visual
    let fc = `[${vidIdx}:v]${scaleFilter}`;
    if (contrast !== 1.0 || brightness !== 0) {
      fc += `,eq=contrast=${contrast}:brightness=${brightness}`;
    }
    if (grain > 0) {
      fc += `,noise=alls=${grain}:allf=t`;
    }
    fc += `[base];`;

    // Scale overlay, set opacity, and apply fade in/out on alpha channel
    fc += `[${ovIdx}:v]scale=${overlayW}:-1,format=rgba`;

    // Base opacity
    if (overlayOpacity < 1.0) {
      fc += `,colorchannelmixer=aa=${overlayOpacity}`;
    }

    // Fade in: alpha goes 0→1 over fadeIn seconds starting at t=0 of overlay
    // Fade out: alpha goes 1→0 over fadeOut seconds ending at tDur
    if (fadeIn > 0) {
      fc += `,fade=t=in:st=0:d=${fadeIn}:alpha=1`;
    }
    if (fadeOut > 0) {
      fc += `,fade=t=out:st=${tDur - fadeOut}:d=${fadeOut}:alpha=1`;
    }

    fc += `[ovr];`;

    // Overlay with enable between tStart and tEnd
    fc += `[base][ovr]overlay=${xy}:enable='between(t,${tStart},${tEnd})'[out]`;

    if (visualType === 'video') {
      args = [
        '-y',
        '-i', visualPath,
        '-i', audioPath,
        '-loop', '1', '-i', overlayPath,
        '-filter_complex', fc,
        '-map', '[out]', '-map', `${audioIdx}:a:0`,
        ...videoEncArgs(null),
        '-c:a', 'aac', '-b:a', `${audioBitrate}k`,
        ...(totalDuration > 0 ? ['-t', `${totalDuration}`] : ['-shortest']),
        ...metaArgs, outputPath
      ];
    } else {
      const imgFps = (fadeIn > 0 || fadeOut > 0) ? '10' : '2';
      args = [
        '-y',
        '-loop', '1', '-framerate', imgFps, '-i', visualPath,
        '-i', audioPath,
        '-loop', '1', '-i', overlayPath,
        '-filter_complex', fc,
        '-map', '[out]', '-map', `${audioIdx}:a:0`,
        ...videoEncArgs('stillimage'),
        '-r', imgFps,
        '-c:a', 'aac', '-b:a', `${audioBitrate}k`,
        ...(totalDuration > 0 ? ['-t', `${totalDuration}`] : ['-shortest']),
        ...metaArgs, outputPath
      ];
    }
  } else {
    let vf = scaleFilter;
    if (contrast !== 1.0 || brightness !== 0) {
      vf += `,eq=contrast=${contrast}:brightness=${brightness}`;
    }
    if (grain > 0) {
      vf += `,noise=alls=${grain}:allf=t`;
    }

    if (visualType === 'video') {
      args = [
        '-y',
        '-i', visualPath,
        '-i', audioPath,
        '-map', '0:v:0', '-map', '1:a:0',
        ...videoEncArgs(null),
        '-c:a', 'aac', '-b:a', `${audioBitrate}k`,
        ...(totalDuration > 0 ? ['-t', `${totalDuration}`] : ['-shortest']),
        '-vf', vf,
        ...metaArgs, outputPath
      ];
    } else {
      args = [
        '-y',
        '-loop', '1', '-framerate', '2', '-i', visualPath,
        '-i', audioPath,
        ...videoEncArgs('stillimage'),
        '-r', '2',
        '-c:a', 'aac', '-b:a', `${audioBitrate}k`,
        ...(totalDuration > 0 ? ['-t', `${totalDuration}`] : ['-shortest']),
        '-vf', vf,
        ...metaArgs, outputPath
      ];
    }
  }

  return new Promise((resolve) => {
    const proc = spawn(ffmpeg, args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      // Parse progress from ffmpeg stderr
      const timeMatch = data.toString().match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (timeMatch) {
        const seconds = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseFloat(timeMatch[3]);
        mainWindow.webContents.send('render-progress', { seconds });
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: outputPath });
      } else {
        resolve({ success: false, error: stderr.slice(-500) });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: `Failed to start FFmpeg: ${err.message}` });
    });
  });
});

