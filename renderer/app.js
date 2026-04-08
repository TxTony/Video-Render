/**
 * VideoRender — Renderer entry point
 * Wires together all UI modules: state, presets, drop zones, preview, animation,
 * metadata, guidance, recap, and render handler.
 * @author TxTony
 */

import state from './modules/state.js';
import { grainLabel, contrastLabel, brightnessLabel } from './modules/labels.js';
import { applyPreset, applyProfile } from './modules/presets.js';
import { setupDropZone } from './modules/dropzones.js';
import { updatePreviewFilters, updateOverlayPreview, setupOverlayDrag } from './modules/preview.js';
import { startAnim, stopAnim, seekTimeline, isPlaying, updatePlaybackVisibility } from './modules/animation.js';
import { probeAndFillMetadata, setupMetadataInputs } from './modules/metadata.js';
import { updateGuidance } from './modules/guidance.js';
import { buildRecap, updateRecap } from './modules/recap.js';
import { setupRenderHandler } from './modules/render.js';
import { setupConverter } from './modules/converter.js';
import { setupUpscaler } from './modules/upscaler.js';

// --- DOM elements ---
const els = {
  // Drop zones
  visualZone:     document.getElementById('visualZone'),
  audioZone:      document.getElementById('audioZone'),
  visualInput:    document.getElementById('visualInput'),
  audioInput:     document.getElementById('audioInput'),
  imagePreview:   document.getElementById('imagePreview'),
  videoPreview:   document.getElementById('videoPreview'),
  audioName:      document.getElementById('audioName'),

  // Preview
  previewPanel:     document.getElementById('previewPanel'),
  previewImg:       document.getElementById('previewImg'),
  previewVid:       document.getElementById('previewVid'),
  previewOverlay:   document.getElementById('previewOverlay'),
  grainOverlay:     document.getElementById('grainOverlay'),
  previewContainer: document.getElementById('previewContainer'),

  // Overlay controls
  overlayZone:       document.getElementById('overlayZone'),
  overlayInput:      document.getElementById('overlayInput'),
  overlayThumb:      document.getElementById('overlayThumb'),
  overlayControls:   document.getElementById('overlayControls'),
  overlayPosition:   document.getElementById('overlayPosition'),
  overlaySize:       document.getElementById('overlaySize'),
  overlayOpacity:    document.getElementById('overlayOpacity'),
  overlaySizeVal:    document.getElementById('overlaySizeVal'),
  overlayOpacityVal: document.getElementById('overlayOpacityVal'),
  overlayStart:      document.getElementById('overlayStart'),
  overlayDuration:   document.getElementById('overlayDuration'),
  overlayTransition: document.getElementById('overlayTransition'),
  overlayStartVal:   document.getElementById('overlayStartVal'),
  overlayDurationVal:document.getElementById('overlayDurationVal'),
  removeOverlay:     document.getElementById('removeOverlay'),
  customPosInfo:     document.getElementById('customPosInfo'),
  customXVal:        document.getElementById('customXVal'),
  customYVal:        document.getElementById('customYVal'),

  // Effect sliders
  grain:        document.getElementById('grain'),
  contrast:     document.getElementById('contrast'),
  brightness:   document.getElementById('brightness'),
  grainVal:     document.getElementById('grainVal'),
  contrastVal:  document.getElementById('contrastVal'),
  brightnessVal:document.getElementById('brightnessVal'),
  grainHint:    document.getElementById('grainHint'),
  contrastHint: document.getElementById('contrastHint'),
  brightnessHint:document.getElementById('brightnessHint'),

  // Output
  profileInfo:    document.getElementById('profileInfo'),
  outputSettings: document.getElementById('outputSettings'),
  resolution:     document.getElementById('resolution'),
  audioBitrate:   document.getElementById('audioBitrate'),
  videoBitrate:   document.getElementById('videoBitrate'),
  crf:            document.getElementById('crf'),
  crfVal:         document.getElementById('crfVal'),
  endPadding:     document.getElementById('endPadding'),
  paddingHint:    document.getElementById('paddingHint'),

  // Metadata
  metaTitle:   document.getElementById('metaTitle'),
  metaArtist:  document.getElementById('metaArtist'),
  metaAlbum:   document.getElementById('metaAlbum'),
  metaGenre:   document.getElementById('metaGenre'),
  metaDate:    document.getElementById('metaDate'),
  metaComment: document.getElementById('metaComment'),

  // Render
  renderBtn:    document.getElementById('renderBtn'),
  progressArea: document.getElementById('progressArea'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  result:       document.getElementById('result'),
  guidance:     document.getElementById('guidance'),

  // Recap
  recapPanel: document.getElementById('recapPanel'),
  recapGrid:  document.getElementById('recapGrid'),

  // Animation
  previewPlayback:      document.getElementById('previewPlayback'),
  playBtn:              document.getElementById('previewPlayBtn'),
  timeBadge:            document.getElementById('previewTimeBadge'),
  timelineBar:          document.getElementById('previewTimelineBar'),
  timelineOverlay:      document.getElementById('previewTimelineOverlay'),
  timelineCursor:       document.getElementById('previewTimelineCursor'),
  timeLabel:            document.getElementById('previewTimeLabel'),
};

// --- Shorthand helpers ---
const refreshFilters = () => updatePreviewFilters(els);
const refreshOverlay = () => updateOverlayPreview(els);
const refreshGuidance = () => updateGuidance(els.guidance);
const refreshRecap = () => updateRecap(els.recapPanel, els.recapGrid, els);
const refreshRenderBtn = () => { els.renderBtn.disabled = !(state.visualPath && state.audioPath); };

function updateSliderHints() {
  els.grainHint.textContent = grainLabel(els.grain.value);
  els.contrastHint.textContent = contrastLabel(els.contrast.value);
  els.brightnessHint.textContent = brightnessLabel(els.brightness.value);
}

function setPresetCustom() {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-preset="custom"]').classList.add('active');
}

function refreshPlayback() {
  updatePlaybackVisibility(els.previewPlayback, els, els);
}

// --- Effect sliders ---
els.grain.oninput = () => { els.grainVal.textContent = els.grain.value; updateSliderHints(); refreshFilters(); setPresetCustom(); refreshRecap(); };
els.contrast.oninput = () => { els.contrastVal.textContent = els.contrast.value; updateSliderHints(); refreshFilters(); setPresetCustom(); refreshRecap(); };
els.brightness.oninput = () => { els.brightnessVal.textContent = els.brightness.value; updateSliderHints(); refreshFilters(); setPresetCustom(); refreshRecap(); };

// --- Overlay sliders ---
els.overlaySize.oninput = () => { els.overlaySizeVal.textContent = els.overlaySize.value; refreshOverlay(); };
els.overlayOpacity.oninput = () => { els.overlayOpacityVal.textContent = Math.round(els.overlayOpacity.value * 100); refreshOverlay(); };
els.overlayPosition.onchange = () => refreshOverlay();
els.overlayStart.oninput = () => { els.overlayStartVal.textContent = els.overlayStart.value; };
els.overlayDuration.oninput = () => { els.overlayDurationVal.textContent = els.overlayDuration.value; };

// --- Output controls ---
els.crf.oninput = () => { els.crfVal.textContent = els.crf.value; };
els.endPadding.oninput = () => {
  const v = parseFloat(els.endPadding.value);
  els.paddingHint.textContent = v === 0 ? 'none' : v + ' second' + (v !== 1 ? 's' : '');
};

// --- Preset buttons ---
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyPreset(btn.dataset.preset, els);
    updateSliderHints();
    refreshFilters();
  });
});

// --- Profile buttons ---
document.querySelectorAll('.profile-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyProfile(btn.dataset.profile, els);
  });
});

// --- Metadata ---
setupMetadataInputs(els);

// --- Overlay drag ---
setupOverlayDrag(els.previewOverlay, els.previewContainer, els.overlayPosition, refreshOverlay);

// --- Drop zones ---
setupDropZone(els.visualZone, els.visualInput, (file) => {
  state.visualPath = window.api.getFilePath(file);
  const isVideo = file.type.startsWith('video/');
  state.visualType = isVideo ? 'video' : 'image';
  els.visualZone.classList.add('has-file');

  if (state.visualBlobUrl) URL.revokeObjectURL(state.visualBlobUrl);
  const url = URL.createObjectURL(file);
  state.visualBlobUrl = url;

  els.imagePreview.style.display = 'none';
  els.videoPreview.style.display = 'none';
  if (isVideo) {
    els.videoPreview.src = url;
    els.videoPreview.style.display = 'block';
    els.videoPreview.play();
  } else {
    els.imagePreview.src = url;
    els.imagePreview.style.display = 'block';
  }

  els.visualZone.querySelector('.drop-zone-icon').style.display = 'none';
  els.visualZone.querySelector('.drop-zone-label').style.display = 'none';
  els.visualZone.querySelector('.drop-zone-hint').style.display = 'none';

  els.previewPanel.style.display = 'block';
  els.previewImg.style.display = 'none';
  els.previewVid.style.display = 'none';
  if (isVideo) {
    els.previewVid.src = url;
    els.previewVid.style.display = 'block';
    els.previewVid.play();
  } else {
    els.previewImg.src = url;
    els.previewImg.style.display = 'block';
  }

  refreshFilters();
  refreshOverlay();
  if (isVideo) probeAndFillMetadata(state.visualPath, els);
  refreshGuidance();
  refreshRenderBtn();
  refreshRecap();
});

setupDropZone(els.audioZone, els.audioInput, (file) => {
  state.audioPath = window.api.getFilePath(file);
  els.audioZone.classList.add('has-file');
  els.audioName.textContent = file.name;
  els.audioName.style.display = 'block';
  els.audioZone.querySelector('.drop-zone-icon').textContent = '✅';
  els.audioZone.querySelector('.drop-zone-label').textContent = file.name;
  els.audioZone.querySelector('.drop-zone-hint').style.display = 'none';

  probeAndFillMetadata(state.audioPath, els);
  refreshGuidance();
  refreshRenderBtn();
  refreshRecap();
});

setupDropZone(els.overlayZone, els.overlayInput, (file) => {
  state.overlayPath = window.api.getFilePath(file);
  els.overlayZone.classList.add('has-file');

  if (state.overlayBlobUrl) URL.revokeObjectURL(state.overlayBlobUrl);
  const url = URL.createObjectURL(file);
  state.overlayBlobUrl = url;
  els.overlayThumb.src = url;
  els.overlayThumb.style.display = 'block';
  els.overlayZone.querySelector('.drop-zone-icon').style.display = 'none';
  els.overlayZone.querySelector('.drop-zone-label').style.display = 'none';
  els.overlayZone.querySelector('.drop-zone-hint').style.display = 'none';

  els.previewOverlay.src = url;
  els.overlayControls.style.display = 'flex';
  refreshOverlay();
  refreshPlayback();
});

els.removeOverlay.addEventListener('click', () => {
  if (state.overlayBlobUrl) { URL.revokeObjectURL(state.overlayBlobUrl); state.overlayBlobUrl = null; }
  state.overlayPath = null;
  els.previewOverlay.style.display = 'none';
  els.overlayControls.style.display = 'none';
  els.overlayZone.classList.remove('has-file');
  els.overlayThumb.style.display = 'none';
  els.overlayZone.querySelector('.drop-zone-icon').style.display = '';
  els.overlayZone.querySelector('.drop-zone-label').style.display = '';
  els.overlayZone.querySelector('.drop-zone-hint').style.display = '';
  refreshPlayback();
});

// --- Animation ---
els.playBtn.addEventListener('click', () => {
  if (isPlaying()) {
    stopAnim(els, els);
  } else {
    startAnim(els, els);
  }
});

els.timelineBar.addEventListener('click', (e) => {
  seekTimeline(e, els.timelineBar, els);
});

// --- Render ---
setupRenderHandler(
  { renderBtn: els.renderBtn, progressArea: els.progressArea, progressFill: els.progressFill, progressText: els.progressText, result: els.result },
  els,
  () => buildRecap(els.recapGrid, els),
  refreshRenderBtn
);

// --- Progress ---
window.api.onProgress((data) => {
  els.progressText.textContent = `Working... ${Math.floor(data.seconds)}s processed`;
});

// --- Auto-update ---
window.api.onUpdateStatus((msg) => {
  const bar = document.getElementById('updateBar');
  bar.textContent = msg;
  bar.style.display = 'block';
});

// --- Tabs ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => {
      t.style.display = 'none';
      t.classList.remove('active');
    });
    const tab = document.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`);
    tab.style.display = 'block';
    tab.classList.add('active');
  });
});

// --- Audio converter ---
setupConverter();

// --- Image upscaler ---
setupUpscaler();

// --- Init ---
els.overlayPosition.value = 'custom';
updateSliderHints();
refreshGuidance();
