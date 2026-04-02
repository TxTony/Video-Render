/**
 * VideoRender — Human-friendly labels
 * Pure functions that convert slider values into readable text.
 * @author TxTony
 */

/**
 * @param {number|string} v - Grain value (0-40)
 * @returns {string} Human label
 */
export function grainLabel(v) {
  v = parseInt(v);
  if (v === 0) return 'none';
  if (v <= 8) return 'subtle';
  if (v <= 18) return 'moderate';
  if (v <= 28) return 'heavy';
  if (v <= 35) return 'extreme (larger file)';
  return 'maximum (much larger file!)';
}

/**
 * @param {number|string} v - Contrast value (0.5-2.0)
 * @returns {string} Human label
 */
export function contrastLabel(v) {
  v = parseFloat(v);
  if (v < 0.85) return 'very flat';
  if (v < 0.95) return 'slightly flat';
  if (v <= 1.05) return 'normal';
  if (v <= 1.2) return 'slightly boosted';
  if (v <= 1.5) return 'boosted';
  return 'intense';
}

/**
 * @param {number|string} v - Brightness value (-0.5 to 0.5)
 * @returns {string} Human label
 */
export function brightnessLabel(v) {
  v = parseFloat(v);
  if (v < -0.15) return 'much darker';
  if (v < -0.05) return 'darker';
  if (v <= 0.05) return 'normal';
  if (v <= 0.15) return 'brighter';
  return 'much brighter';
}
