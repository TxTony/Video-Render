/**
 * VideoRender — Presets and output profiles
 * Defines visual style presets and platform output profiles.
 * @author TxTony
 */

export const PRESETS = {
  grind:      { grain: 10, contrast: 1.1,  brightness: 0.02 },
  clean:      { grain: 0,  contrast: 1.0,  brightness: 0.0  },
  vhs:        { grain: 25, contrast: 1.3,  brightness: -0.05 },
  blackmetal: { grain: 30, contrast: 1.6,  brightness: -0.15 },
  lofi:       { grain: 15, contrast: 0.85, brightness: 0.05 },
};

export const PROFILES = {
  youtube:  { resolution: '1920x1080', audioBitrate: '192', videoBitrate: '0', crf: 18,
              info: 'Great quality, uploads fast on YouTube' },
  facebook: { resolution: '1280x720',  audioBitrate: '128', videoBitrate: '4000', crf: 23,
              info: 'Optimized for Facebook — good quality, stays under upload limits' },
  instagram:{ resolution: '1080x1080', audioBitrate: '128', videoBitrate: '3500', crf: 23,
              info: 'Square format for Instagram posts' },
  full:     { resolution: '1920x1080', audioBitrate: '320', videoBitrate: '0', crf: 10,
              info: 'Maximum quality — large file, perfect for archiving' },
  small:    { resolution: '1280x720',  audioBitrate: '96',  videoBitrate: '0', crf: 28,
              info: 'Tiny file — good for messaging apps or quick sharing' },
};

/**
 * Apply a visual style preset to the effect sliders.
 * @param {string} name - Preset key from PRESETS
 * @param {Object} els - DOM elements: { grain, grainVal, contrast, contrastVal, brightness, brightnessVal }
 * @returns {boolean} true if preset was applied, false if not found
 */
export function applyPreset(name, els) {
  const p = PRESETS[name];
  if (!p) return false;

  els.grain.value = p.grain;
  els.grainVal.textContent = p.grain;
  els.contrast.value = p.contrast;
  els.contrastVal.textContent = p.contrast;
  els.brightness.value = p.brightness;
  els.brightnessVal.textContent = p.brightness;
  return true;
}

/**
 * Apply an output profile to the output settings.
 * @param {string} name - Profile key from PROFILES
 * @param {Object} els - DOM elements: { resolution, audioBitrate, videoBitrate, crf, crfVal, profileInfo, outputSettings }
 * @returns {boolean} true if profile was applied, false if custom
 */
export function applyProfile(name, els) {
  const p = PROFILES[name];
  if (!p) {
    els.outputSettings.style.display = 'grid';
    els.profileInfo.textContent = 'You control everything — for advanced users';
    return false;
  }
  els.outputSettings.style.display = 'none';
  els.resolution.value = p.resolution;
  els.audioBitrate.value = p.audioBitrate;
  els.videoBitrate.value = p.videoBitrate;
  els.crf.value = p.crf;
  els.crfVal.textContent = p.crf;
  els.profileInfo.textContent = p.info;
  return true;
}
