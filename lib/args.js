/**
 * VideoRender — FFmpeg argument builder
 * Pure functions to construct FFmpeg command-line arguments for rendering.
 * No side effects, no I/O — fully unit-testable.
 * @author TxTony
 */

/**
 * Build FFmpeg -metadata arguments from render options.
 * @param {Object} opts
 * @param {string} [opts.metaTitle] - Video title
 * @param {string} [opts.metaArtist] - Artist / band name
 * @param {string} [opts.metaAlbum] - Album name
 * @param {string} [opts.metaGenre] - Genre
 * @param {string} [opts.metaDate] - Year / date
 * @param {string} [opts.metaComment] - Description / comment
 * @returns {string[]} Array of FFmpeg arguments (e.g. ['-metadata', 'title=Song', ...])
 */
function buildMetadataArgs(opts) {
  const args = [];
  const fields = [
    ['title', opts.metaTitle],
    ['artist', opts.metaArtist],
    ['album', opts.metaAlbum],
    ['genre', opts.metaGenre],
    ['date', opts.metaDate],
    ['comment', opts.metaComment]
  ];
  for (const [key, val] of fields) {
    if (val) args.push('-metadata', `${key}=${val}`);
  }
  return args;
}

/**
 * Create a function that builds video encoding arguments (H.264).
 * Uses CRF mode by default, switches to bitrate mode if videoBitrate > 0.
 * Automatically bumps CRF when grain is high to avoid encoding noise at full quality.
 * @param {Object} opts
 * @param {number} opts.videoBitrate - Target bitrate in kbps (0 = use CRF mode)
 * @param {number} opts.crf - Constant Rate Factor (0=lossless, 51=worst)
 * @param {number} opts.grain - Film grain level (0-40), affects CRF adjustment
 * @returns {function(string|null): string[]} Function that takes an optional tune preset and returns encoding args
 */
function buildVideoEncArgs(opts) {
  const { videoBitrate, crf, grain } = opts;
  const grainCrfBump = grain > 20 ? Math.round((grain - 20) * 0.3) : 0;
  const effectiveCrf = Math.min(crf + grainCrfBump, 40);

  return function videoEncArgs(tune) {
    const enc = ['-c:v', 'libx264'];
    if (tune) enc.push('-tune', tune);
    if (videoBitrate > 0) {
      enc.push('-b:v', `${videoBitrate}k`, '-maxrate', `${videoBitrate}k`, '-bufsize', `${videoBitrate * 2}k`);
    } else {
      enc.push('-crf', `${effectiveCrf}`);
    }
    enc.push('-pix_fmt', 'yuv420p');
    return enc;
  };
}

/**
 * Build a scale filter that preserves aspect ratio with black padding.
 * @param {number} w - Target width in pixels
 * @param {number} h - Target height in pixels
 * @returns {string} FFmpeg scale+pad filter string
 */
function buildScaleFilter(w, h) {
  return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black`;
}

/**
 * Build a video filter chain with scale, contrast/brightness, and grain.
 * @param {string} scaleFilter - Base scale filter from buildScaleFilter()
 * @param {Object} opts
 * @param {number} opts.contrast - Contrast multiplier (1.0 = normal)
 * @param {number} opts.brightness - Brightness offset (0.0 = normal)
 * @param {number} opts.grain - Film grain intensity (0 = none, 40 = extreme)
 * @returns {string} FFmpeg -vf filter string
 */
function buildVideoFilter(scaleFilter, opts) {
  let vf = scaleFilter;
  if (opts.contrast !== 1.0 || opts.brightness !== 0) {
    vf += `,eq=contrast=${opts.contrast}:brightness=${opts.brightness}`;
  }
  if (opts.grain > 0) {
    vf += `,noise=alls=${opts.grain}:allf=t`;
  }
  return vf;
}

/**
 * Compute FFmpeg overlay position expression.
 * @param {string} pos - Position preset: 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'custom'
 * @param {number} w - Video width in pixels
 * @param {number} h - Video height in pixels
 * @param {number} [customX=50] - Custom X position in percent (0-100), used when pos='custom'
 * @param {number} [customY=50] - Custom Y position in percent (0-100), used when pos='custom'
 * @returns {string} FFmpeg overlay x:y expression
 */
function getOverlayXY(pos, w, h, customX, customY) {
  const pad = 20;
  switch (pos) {
    case 'center':       return `x=(W-w)/2:y=(H-h)/2`;
    case 'top-left':     return `x=${pad}:y=${pad}`;
    case 'top-right':    return `x=W-w-${pad}:y=${pad}`;
    case 'bottom-left':  return `x=${pad}:y=H-h-${pad}`;
    case 'bottom-right': return `x=W-w-${pad}:y=H-h-${pad}`;
    case 'custom': {
      const px = Math.round(w * (customX || 50) / 100);
      const py = Math.round(h * (customY || 50) / 100);
      return `x=${px}-w/2:y=${py}-h/2`;
    }
    default: return `x=(W-w)/2:y=(H-h)/2`;
  }
}

/**
 * Build the FFmpeg filter_complex string for overlay compositing.
 * Handles scaling, effects, overlay positioning, opacity, and fade in/out.
 * @param {Object} opts
 * @param {number} opts.overlaySize - Overlay width as percentage of video width (5-100)
 * @param {string} opts.overlayPosition - Position preset or 'custom'
 * @param {number} [opts.overlayCustomX] - Custom X percent (when position='custom')
 * @param {number} [opts.overlayCustomY] - Custom Y percent (when position='custom')
 * @param {number} opts.overlayOpacity - Overlay opacity (0.1-1.0)
 * @param {number} opts.overlayStart - When the overlay appears in seconds
 * @param {number} opts.overlayDuration - How long the overlay is visible in seconds
 * @param {string} opts.overlayTransition - Transition type: 'none', 'fade', 'fade-long'
 * @param {number} opts.contrast - Contrast multiplier
 * @param {number} opts.brightness - Brightness offset
 * @param {number} opts.grain - Film grain intensity
 * @param {string} scaleFilter - Base scale filter from buildScaleFilter()
 * @param {number} w - Video width in pixels
 * @param {number} h - Video height in pixels
 * @returns {{ fc: string, fadeIn: number, fadeOut: number }} filter_complex string and fade durations
 */
function buildFilterComplex(opts, scaleFilter, w, h) {
  const { overlaySize, overlayPosition, overlayCustomX, overlayCustomY,
          overlayOpacity, overlayStart, overlayDuration, overlayTransition,
          contrast, brightness, grain } = opts;

  const overlayW = Math.round(w * overlaySize / 100);
  const xy = getOverlayXY(overlayPosition, w, h, overlayCustomX, overlayCustomY);
  const tStart = overlayStart || 0;
  const tDur = overlayDuration || 5;
  const tEnd = tStart + tDur;

  let fadeIn = 0, fadeOut = 0;
  if (overlayTransition === 'fade') { fadeIn = 0.5; fadeOut = 0.5; }
  else if (overlayTransition === 'fade-long') { fadeIn = 1.5; fadeOut = 1.5; }

  let fc = `[0:v]${scaleFilter}`;
  if (contrast !== 1.0 || brightness !== 0) {
    fc += `,eq=contrast=${contrast}:brightness=${brightness}`;
  }
  if (grain > 0) {
    fc += `,noise=alls=${grain}:allf=t`;
  }
  fc += `[base];`;

  fc += `[2:v]scale=${overlayW}:-1,format=rgba`;
  if (overlayOpacity < 1.0) {
    fc += `,colorchannelmixer=aa=${overlayOpacity}`;
  }
  if (fadeIn > 0) {
    fc += `,fade=t=in:st=0:d=${fadeIn}:alpha=1`;
  }
  if (fadeOut > 0) {
    fc += `,fade=t=out:st=${tDur - fadeOut}:d=${fadeOut}:alpha=1`;
  }
  fc += `[ovr];`;

  fc += `[base][ovr]overlay=${xy}:enable='between(t,${tStart},${tEnd})'[out]`;

  return { fc, fadeIn, fadeOut };
}

/**
 * Build the complete FFmpeg argument array for a render job.
 * Handles all 4 combinations: image/video x with/without overlay.
 * @param {Object} opts - Full render options from the UI
 * @param {string} opts.visualPath - Path to the image or video file
 * @param {string} opts.visualType - 'image' or 'video'
 * @param {string} opts.audioPath - Path to the audio file
 * @param {string} opts.outputPath - Path for the output MP4
 * @param {string} [opts.overlayPath] - Path to overlay PNG (null if none)
 * @param {string} opts.resolution - Output resolution as 'WxH' (e.g. '1920x1080')
 * @param {string} opts.audioBitrate - Audio bitrate in kbps (e.g. '192')
 * @param {number} opts.videoBitrate - Video bitrate in kbps (0 = CRF mode)
 * @param {number} opts.crf - Constant Rate Factor
 * @param {number} opts.grain - Film grain intensity
 * @param {number} opts.contrast - Contrast multiplier
 * @param {number} opts.brightness - Brightness offset
 * @param {number} totalDuration - Total output duration in seconds (audio + padding)
 * @returns {string[]} Complete FFmpeg argument array
 */
function buildRenderArgs(opts, totalDuration) {
  const { visualPath, visualType, audioPath, outputPath, overlayPath,
          resolution, audioBitrate } = opts;

  const [width, height] = resolution.split('x');
  const w = parseInt(width);
  const h = parseInt(height);

  const scaleFilter = buildScaleFilter(w, h);
  const videoEncArgs = buildVideoEncArgs(opts);
  const metaArgs = buildMetadataArgs(opts);
  const durationArgs = totalDuration > 0 ? ['-t', `${totalDuration}`] : ['-shortest'];
  const hasOverlay = !!overlayPath;

  if (hasOverlay) {
    const { fc, fadeIn, fadeOut } = buildFilterComplex(opts, scaleFilter, w, h);

    if (visualType === 'video') {
      return [
        '-y',
        '-i', visualPath,
        '-i', audioPath,
        '-loop', '1', '-i', overlayPath,
        '-filter_complex', fc,
        '-map', '[out]', '-map', '1:a:0',
        ...videoEncArgs(null),
        '-c:a', 'aac', '-b:a', `${audioBitrate}k`,
        ...durationArgs,
        ...metaArgs, outputPath
      ];
    } else {
      const imgFps = (fadeIn > 0 || fadeOut > 0) ? '10' : '2';
      return [
        '-y',
        '-loop', '1', '-framerate', imgFps, '-i', visualPath,
        '-i', audioPath,
        '-loop', '1', '-i', overlayPath,
        '-filter_complex', fc,
        '-map', '[out]', '-map', '1:a:0',
        ...videoEncArgs('stillimage'),
        '-r', imgFps,
        '-c:a', 'aac', '-b:a', `${audioBitrate}k`,
        ...durationArgs,
        ...metaArgs, outputPath
      ];
    }
  } else {
    const vf = buildVideoFilter(scaleFilter, opts);

    if (visualType === 'video') {
      return [
        '-y',
        '-i', visualPath,
        '-i', audioPath,
        '-map', '0:v:0', '-map', '1:a:0',
        ...videoEncArgs(null),
        '-c:a', 'aac', '-b:a', `${audioBitrate}k`,
        ...durationArgs,
        '-vf', vf,
        ...metaArgs, outputPath
      ];
    } else {
      return [
        '-y',
        '-loop', '1', '-framerate', '2', '-i', visualPath,
        '-i', audioPath,
        ...videoEncArgs('stillimage'),
        '-r', '2',
        '-c:a', 'aac', '-b:a', `${audioBitrate}k`,
        ...durationArgs,
        '-vf', vf,
        ...metaArgs, outputPath
      ];
    }
  }
}

module.exports = {
  buildMetadataArgs,
  buildVideoEncArgs,
  buildScaleFilter,
  buildVideoFilter,
  buildFilterComplex,
  buildRenderArgs,
  getOverlayXY
};
