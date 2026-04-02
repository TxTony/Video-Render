// State
let visualPath = null;
let visualType = null;
let audioPath = null;
let overlayPath = null;
let customOverlayX = 50; // percent
let customOverlayY = 50; // percent

// Presets: { grain, contrast, brightness }
const PRESETS = {
  grind:      { grain: 10, contrast: 1.1,  brightness: 0.02 },
  clean:      { grain: 0,  contrast: 1.0,  brightness: 0.0  },
  vhs:        { grain: 25, contrast: 1.3,  brightness: -0.05 },
  blackmetal: { grain: 30, contrast: 1.6,  brightness: -0.15 },
  lofi:       { grain: 15, contrast: 0.85, brightness: 0.05 },
};

// Output profiles
const PROFILES = {
  youtube:       { resolution: '1920x1080', audioBitrate: '192', videoBitrate: '0', crf: 18,
                   info: 'Great quality, uploads fast on YouTube' },
  facebook:      { resolution: '1280x720',  audioBitrate: '128', videoBitrate: '4000', crf: 23,
                   info: 'Optimized for Facebook — good quality, stays under upload limits' },
  instagram:     { resolution: '1080x1080', audioBitrate: '128', videoBitrate: '3500', crf: 23,
                   info: 'Square format for Instagram posts' },
  full:          { resolution: '1920x1080', audioBitrate: '320', videoBitrate: '0', crf: 10,
                   info: 'Maximum quality — large file, perfect for archiving' },
  small:         { resolution: '1280x720',  audioBitrate: '96',  videoBitrate: '0', crf: 28,
                   info: 'Tiny file — good for messaging apps or quick sharing' },
};

// Elements
const visualZone = document.getElementById('visualZone');
const audioZone = document.getElementById('audioZone');
const visualInput = document.getElementById('visualInput');
const audioInput = document.getElementById('audioInput');
const imagePreview = document.getElementById('imagePreview');
const videoPreview = document.getElementById('videoPreview');
const audioName = document.getElementById('audioName');
const renderBtn = document.getElementById('renderBtn');
const progressArea = document.getElementById('progressArea');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const result = document.getElementById('result');
const guidance = document.getElementById('guidance');

// Preview elements
const previewPanel = document.getElementById('previewPanel');
const previewImg = document.getElementById('previewImg');
const previewVid = document.getElementById('previewVid');
const previewOverlay = document.getElementById('previewOverlay');
const grainOverlay = document.getElementById('grainOverlay');

// Overlay elements
const overlayZone = document.getElementById('overlayZone');
const overlayInput = document.getElementById('overlayInput');
const overlayThumb = document.getElementById('overlayThumb');
const overlayControls = document.getElementById('overlayControls');
const overlayPosition = document.getElementById('overlayPosition');
const overlaySize = document.getElementById('overlaySize');
const overlayOpacity = document.getElementById('overlayOpacity');
const overlaySizeVal = document.getElementById('overlaySizeVal');
const overlayOpacityVal = document.getElementById('overlayOpacityVal');
const overlayStart = document.getElementById('overlayStart');
const overlayDuration = document.getElementById('overlayDuration');
const overlayTransition = document.getElementById('overlayTransition');
const overlayStartVal = document.getElementById('overlayStartVal');
const overlayDurationVal = document.getElementById('overlayDurationVal');
const removeOverlay = document.getElementById('removeOverlay');

// Sliders
const grain = document.getElementById('grain');
const contrast = document.getElementById('contrast');
const brightness = document.getElementById('brightness');
const grainVal = document.getElementById('grainVal');
const contrastVal = document.getElementById('contrastVal');
const brightnessVal = document.getElementById('brightnessVal');
const grainHint = document.getElementById('grainHint');
const contrastHint = document.getElementById('contrastHint');
const brightnessHint = document.getElementById('brightnessHint');

// --- Human-friendly slider hints ---
function grainLabel(v) {
  v = parseInt(v);
  if (v === 0) return 'none';
  if (v <= 8) return 'subtle';
  if (v <= 18) return 'moderate';
  if (v <= 28) return 'heavy';
  if (v <= 35) return 'extreme (larger file)';
  return 'maximum (much larger file!)';
}

function contrastLabel(v) {
  v = parseFloat(v);
  if (v < 0.85) return 'very flat';
  if (v < 0.95) return 'slightly flat';
  if (v <= 1.05) return 'normal';
  if (v <= 1.2) return 'slightly boosted';
  if (v <= 1.5) return 'boosted';
  return 'intense';
}

function brightnessLabel(v) {
  v = parseFloat(v);
  if (v < -0.15) return 'much darker';
  if (v < -0.05) return 'darker';
  if (v <= 0.05) return 'normal';
  if (v <= 0.15) return 'brighter';
  return 'much brighter';
}

function updateSliderHints() {
  grainHint.textContent = grainLabel(grain.value);
  contrastHint.textContent = contrastLabel(contrast.value);
  brightnessHint.textContent = brightnessLabel(brightness.value);
}

// --- Preview filters ---
function updatePreviewFilters() {
  const c = parseFloat(contrast.value);
  const b = parseFloat(brightness.value);
  const g = parseInt(grain.value);

  const cssFilter = `contrast(${c}) brightness(${1 + b})`;
  previewImg.style.filter = cssFilter;
  previewVid.style.filter = cssFilter;

  grainOverlay.style.opacity = g / 40 * 0.6;
}

const customPosInfo = document.getElementById('customPosInfo');
const customXVal = document.getElementById('customXVal');
const customYVal = document.getElementById('customYVal');

function updateOverlayPreview() {
  if (!overlayPath) {
    previewOverlay.style.display = 'none';
    return;
  }
  previewOverlay.style.display = 'block';
  previewOverlay.style.opacity = overlayOpacity.value;

  const size = parseInt(overlaySize.value);
  previewOverlay.style.width = size + '%';
  previewOverlay.style.height = 'auto';
  previewOverlay.style.maxHeight = size + '%';

  const pos = overlayPosition.value;
  const pad = '2%';
  previewOverlay.style.top = '';
  previewOverlay.style.bottom = '';
  previewOverlay.style.left = '';
  previewOverlay.style.right = '';
  previewOverlay.style.transform = '';

  // Toggle drag vs pointer-events
  const isCustom = pos === 'custom';
  previewOverlay.classList.toggle('no-drag', !isCustom);
  customPosInfo.style.display = isCustom ? 'block' : 'none';

  if (isCustom) {
    previewOverlay.style.left = customOverlayX + '%';
    previewOverlay.style.top = customOverlayY + '%';
    previewOverlay.style.transform = 'translate(-50%, -50%)';
    customXVal.textContent = Math.round(customOverlayX);
    customYVal.textContent = Math.round(customOverlayY);
    return;
  }

  switch (pos) {
    case 'center':
      previewOverlay.style.top = '50%';
      previewOverlay.style.left = '50%';
      previewOverlay.style.transform = 'translate(-50%, -50%)';
      break;
    case 'top-left':
      previewOverlay.style.top = pad;
      previewOverlay.style.left = pad;
      break;
    case 'top-right':
      previewOverlay.style.top = pad;
      previewOverlay.style.right = pad;
      break;
    case 'bottom-left':
      previewOverlay.style.bottom = pad;
      previewOverlay.style.left = pad;
      break;
    case 'bottom-right':
      previewOverlay.style.bottom = pad;
      previewOverlay.style.right = pad;
      break;
  }
}

// --- Overlay drag ---
let overlayDragging = false;

previewOverlay.addEventListener('mousedown', (e) => {
  if (overlayPosition.value !== 'custom') return;
  overlayDragging = true;
  previewOverlay.classList.add('dragging');
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!overlayDragging) return;
  const rect = document.getElementById('previewContainer').getBoundingClientRect();
  customOverlayX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
  customOverlayY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
  updateOverlayPreview();
});

document.addEventListener('mouseup', () => {
  if (overlayDragging) {
    overlayDragging = false;
    previewOverlay.classList.remove('dragging');
  }
});

grain.oninput = () => { grainVal.textContent = grain.value; updateSliderHints(); updatePreviewFilters(); setPresetCustom(); updateRecap(); };
contrast.oninput = () => { contrastVal.textContent = contrast.value; updateSliderHints(); updatePreviewFilters(); setPresetCustom(); updateRecap(); };
brightness.oninput = () => { brightnessVal.textContent = brightness.value; updateSliderHints(); updatePreviewFilters(); setPresetCustom(); updateRecap(); };

overlaySize.oninput = () => { overlaySizeVal.textContent = overlaySize.value; updateOverlayPreview(); };
overlayOpacity.oninput = () => { overlayOpacityVal.textContent = Math.round(overlayOpacity.value * 100); updateOverlayPreview(); };
overlayPosition.onchange = () => updateOverlayPreview();
overlayStart.oninput = () => { overlayStartVal.textContent = overlayStart.value; };
overlayDuration.oninput = () => { overlayDurationVal.textContent = overlayDuration.value; };

// --- Presets ---
function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  grain.value = p.grain;
  grainVal.textContent = p.grain;
  contrast.value = p.contrast;
  contrastVal.textContent = p.contrast;
  brightness.value = p.brightness;
  brightnessVal.textContent = p.brightness;

  updateSliderHints();
  updatePreviewFilters();
}

function setPresetCustom() {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-preset="custom"]').classList.add('active');
}

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyPreset(btn.dataset.preset);
  });
});

// --- Output profiles ---
const profileInfo = document.getElementById('profileInfo');
const outputSettings = document.getElementById('outputSettings');
const resolution = document.getElementById('resolution');
const audioBitrate = document.getElementById('audioBitrate');
const videoBitrate = document.getElementById('videoBitrate');
const crf = document.getElementById('crf');
const crfVal = document.getElementById('crfVal');
const endPadding = document.getElementById('endPadding');
const paddingHint = document.getElementById('paddingHint');

crf.oninput = () => { crfVal.textContent = crf.value; };
endPadding.oninput = () => {
  const v = parseFloat(endPadding.value);
  paddingHint.textContent = v === 0 ? 'none' : v + ' second' + (v !== 1 ? 's' : '');
};

function applyProfile(name) {
  const p = PROFILES[name];
  if (!p) {
    outputSettings.style.display = 'grid';
    profileInfo.textContent = 'You control everything — for advanced users';
    return;
  }
  outputSettings.style.display = 'none';
  resolution.value = p.resolution;
  audioBitrate.value = p.audioBitrate;
  videoBitrate.value = p.videoBitrate;
  crf.value = p.crf;
  crfVal.textContent = p.crf;
  profileInfo.textContent = p.info;
}

document.querySelectorAll('.profile-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyProfile(btn.dataset.profile);
  });
});

// --- Metadata ---
const metaTitle = document.getElementById('metaTitle');
const metaArtist = document.getElementById('metaArtist');
const metaAlbum = document.getElementById('metaAlbum');
const metaGenre = document.getElementById('metaGenre');
const metaDate = document.getElementById('metaDate');
const metaComment = document.getElementById('metaComment');

function autoFillField(input, value) {
  if (value && !input.value) {
    input.value = value;
    input.classList.add('auto-filled');
  }
}

async function probeAndFillMetadata(filePath) {
  const tags = await window.api.probeMetadata(filePath);
  if (!tags) return;
  autoFillField(metaTitle, tags.title);
  autoFillField(metaArtist, tags.artist || tags.album_artist);
  autoFillField(metaAlbum, tags.album);
  autoFillField(metaGenre, tags.genre);
  autoFillField(metaDate, tags.date);
  autoFillField(metaComment, tags.comment || tags.description);
}

// Remove auto-filled highlight on manual edit
[metaTitle, metaArtist, metaAlbum, metaGenre, metaDate, metaComment].forEach(input => {
  input.addEventListener('input', () => input.classList.remove('auto-filled'));
});

// --- Guidance ---
function updateGuidance() {
  if (!visualPath && !audioPath) {
    guidance.textContent = 'Start by dropping your image or video above';
    guidance.className = 'guidance';
  } else if (visualPath && !audioPath) {
    guidance.textContent = 'Got it! Now drop your song on the right';
    guidance.className = 'guidance';
  } else if (!visualPath && audioPath) {
    guidance.textContent = 'Now drop your image or video on the left';
    guidance.className = 'guidance';
  } else {
    guidance.textContent = 'Ready! Choose your output format below, then click "Create Video"';
    guidance.className = 'guidance done';
  }
}

// --- Drag & drop ---
function setupDropZone(zone, input, onFile) {
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length > 0) onFile(input.files[0]);
  });
  zone.addEventListener('dragenter', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  });
}

// Visual handling
setupDropZone(visualZone, visualInput, (file) => {
  visualPath = window.api.getFilePath(file);
  const isVideo = file.type.startsWith('video/');
  visualType = isVideo ? 'video' : 'image';
  visualZone.classList.add('has-file');

  const url = URL.createObjectURL(file);

  imagePreview.style.display = 'none';
  videoPreview.style.display = 'none';

  if (isVideo) {
    videoPreview.src = url;
    videoPreview.style.display = 'block';
    videoPreview.play();
  } else {
    imagePreview.src = url;
    imagePreview.style.display = 'block';
  }

  visualZone.querySelector('.drop-zone-icon').style.display = 'none';
  visualZone.querySelector('.drop-zone-label').style.display = 'none';
  visualZone.querySelector('.drop-zone-hint').style.display = 'none';

  // Show preview panel
  previewPanel.style.display = 'block';
  previewImg.style.display = 'none';
  previewVid.style.display = 'none';

  if (isVideo) {
    previewVid.src = url;
    previewVid.style.display = 'block';
    previewVid.play();
  } else {
    previewImg.src = url;
    previewImg.style.display = 'block';
  }
  updatePreviewFilters();
  updateOverlayPreview();

  // Probe video metadata if it's a video file
  if (isVideo) probeAndFillMetadata(visualPath);

  updateGuidance();
  updateRenderBtn();
  updateRecap();
});

// Audio handling
setupDropZone(audioZone, audioInput, (file) => {
  audioPath = window.api.getFilePath(file);
  audioZone.classList.add('has-file');

  audioName.textContent = file.name;
  audioName.style.display = 'block';
  audioZone.querySelector('.drop-zone-icon').textContent = '✅';
  audioZone.querySelector('.drop-zone-label').textContent = file.name;
  audioZone.querySelector('.drop-zone-hint').style.display = 'none';

  // Probe audio metadata and auto-fill
  probeAndFillMetadata(audioPath);

  updateGuidance();
  updateRenderBtn();
  updateRecap();
});

// Overlay handling
setupDropZone(overlayZone, overlayInput, (file) => {
  overlayPath = window.api.getFilePath(file);
  overlayZone.classList.add('has-file');

  const url = URL.createObjectURL(file);
  overlayThumb.src = url;
  overlayThumb.style.display = 'block';
  overlayZone.querySelector('.drop-zone-icon').style.display = 'none';
  overlayZone.querySelector('.drop-zone-label').style.display = 'none';
  overlayZone.querySelector('.drop-zone-hint').style.display = 'none';

  previewOverlay.src = url;
  overlayControls.style.display = 'flex';
  updateOverlayPreview();
  updatePlaybackVisibility();
});

removeOverlay.addEventListener('click', () => {
  overlayPath = null;
  previewOverlay.style.display = 'none';
  overlayControls.style.display = 'none';
  overlayZone.classList.remove('has-file');
  overlayThumb.style.display = 'none';
  overlayZone.querySelector('.drop-zone-icon').style.display = '';
  overlayZone.querySelector('.drop-zone-label').style.display = '';
  overlayZone.querySelector('.drop-zone-hint').style.display = '';
  updatePlaybackVisibility();
});

function updateRenderBtn() {
  renderBtn.disabled = !(visualPath && audioPath);
}

// --- Friendly error messages ---
function friendlyError(raw) {
  if (raw.includes('No such file or directory')) return 'Could not find one of your files. Try dropping them again.';
  if (raw.includes('Invalid data found')) return 'One of your files might be corrupted or in an unsupported format. Try a different file.';
  if (raw.includes('Permission denied')) return 'Cannot save to that location. Try choosing a different folder.';
  if (raw.includes('already exists')) return 'A file with that name already exists. Choose a different name.';
  if (raw.includes('Encoder') || raw.includes('codec')) return 'Video encoding error. Try a different output format.';
  return 'Something went wrong. Check that your files are not corrupted and try again.';
}

// --- Preview animation ---
const previewPlayback = document.getElementById('previewPlayback');
const previewPlayBtn = document.getElementById('previewPlayBtn');
const previewTimeBadge = document.getElementById('previewTimeBadge');
const previewTimelineBar = document.getElementById('previewTimelineBar');
const previewTimelineOverlay = document.getElementById('previewTimelineOverlay');
const previewTimelineCursor = document.getElementById('previewTimelineCursor');
const previewTimeLabel = document.getElementById('previewTimeLabel');

let animPlaying = false;
let animTime = 0;
let animRaf = null;
let animLastTs = null;

// Preview duration = overlay end + 2s buffer, minimum 10s
function getPreviewDuration() {
  const tStart = parseFloat(overlayStart.value) || 0;
  const tDur = parseFloat(overlayDuration.value) || 5;
  return Math.max(tStart + tDur + 2, 10);
}

function getFadeDurations() {
  const t = overlayTransition.value;
  if (t === 'fade') return { fadeIn: 0.5, fadeOut: 0.5 };
  if (t === 'fade-long') return { fadeIn: 1.5, fadeOut: 1.5 };
  return { fadeIn: 0, fadeOut: 0 };
}

function updatePreviewAnimation(time) {
  if (!overlayPath) return;

  const tStart = parseFloat(overlayStart.value) || 0;
  const tDur = parseFloat(overlayDuration.value) || 5;
  const tEnd = tStart + tDur;
  const { fadeIn, fadeOut } = getFadeDurations();
  const baseOpacity = parseFloat(overlayOpacity.value);

  let alpha = 0;

  if (time >= tStart && time <= tEnd) {
    alpha = 1;
    // Fade in
    if (fadeIn > 0 && time < tStart + fadeIn) {
      alpha = (time - tStart) / fadeIn;
    }
    // Fade out
    if (fadeOut > 0 && time > tEnd - fadeOut) {
      alpha = (tEnd - time) / fadeOut;
    }
    alpha = Math.max(0, Math.min(1, alpha));
  }

  previewOverlay.style.opacity = alpha * baseOpacity;
  previewOverlay.style.display = alpha > 0 ? 'block' : 'none';

  // Update timeline
  const dur = getPreviewDuration();
  const pct = (time / dur) * 100;
  previewTimelineCursor.style.left = pct + '%';
  previewTimeBadge.textContent = time.toFixed(1) + 's';
  previewTimeLabel.textContent = `${time.toFixed(1)}s / ${dur}s`;

  // Show overlay zone on timeline
  const startPct = (tStart / dur) * 100;
  const endPct = (tEnd / dur) * 100;
  previewTimelineOverlay.style.left = startPct + '%';
  previewTimelineOverlay.style.width = (endPct - startPct) + '%';
}

function animLoop(ts) {
  if (!animPlaying) return;
  if (animLastTs === null) animLastTs = ts;
  const dt = (ts - animLastTs) / 1000;
  animLastTs = ts;
  animTime += dt;

  const dur = getPreviewDuration();
  if (animTime >= dur) {
    animTime = 0;
  }

  updatePreviewFilters();
  updatePreviewAnimation(animTime);
  animRaf = requestAnimationFrame(animLoop);
}

function startAnim() {
  animPlaying = true;
  animLastTs = null;
  previewPlayBtn.classList.add('playing');
  previewPlayBtn.innerHTML = '&#9724; Stop';
  previewTimeBadge.style.display = 'block';
  grainOverlay.classList.add('animating');
  animRaf = requestAnimationFrame(animLoop);
}

function stopAnim() {
  animPlaying = false;
  previewPlayBtn.classList.remove('playing');
  previewPlayBtn.innerHTML = '&#9654; Preview animation';
  previewTimeBadge.style.display = 'none';
  grainOverlay.classList.remove('animating');
  if (animRaf) cancelAnimationFrame(animRaf);
  // Restore static overlay
  updateOverlayPreview();
}

previewPlayBtn.addEventListener('click', () => {
  if (animPlaying) {
    stopAnim();
  } else {
    animTime = 0;
    startAnim();
  }
});

// Click on timeline to seek
previewTimelineBar.addEventListener('click', (e) => {
  const rect = previewTimelineBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  animTime = pct * getPreviewDuration();
  updatePreviewAnimation(animTime);
});

// Show playback controls when overlay is loaded
function updatePlaybackVisibility() {
  previewPlayback.style.display = overlayPath ? 'flex' : 'none';
  if (!overlayPath && animPlaying) stopAnim();
}

// --- Recap ---
const recapPanel = document.getElementById('recapPanel');
const recapGrid = document.getElementById('recapGrid');

function buildRecap() {
  const rows = [];

  function row(label, value, highlight) {
    rows.push(`<div class="recap-row"><span class="recap-label">${label}</span><span class="recap-value${highlight ? ' active' : ''}">${value}</span></div>`);
  }

  // Files
  if (visualPath) row('Visual', visualPath.split(/[/\\]/).pop());
  if (audioPath) row('Audio', audioPath.split(/[/\\]/).pop());

  // Output
  const activeProfile = document.querySelector('.profile-btn.active');
  if (activeProfile) row('Output', activeProfile.textContent.trim());
  row('Resolution', resolution.value);

  // Effects
  const activePreset = document.querySelector('.preset-btn.active');
  const styleName = activePreset ? activePreset.textContent.trim() : 'Custom';
  const g = parseInt(grain.value);
  const c = parseFloat(contrast.value);
  const b = parseFloat(brightness.value);
  const hasEffects = g > 0 || c !== 1.0 || b !== 0;
  row('Style', styleName, hasEffects);
  if (g > 0) row('Film grain', grainLabel(g), true);
  if (c !== 1.0) row('Contrast', contrastLabel(c), true);
  if (b !== 0) row('Brightness', brightnessLabel(b), true);

  // Overlay
  if (overlayPath) {
    row('Overlay', overlayPath.split(/[/\\]/).pop(), true);
    row('Overlay position', overlayPosition.value);
    row('Overlay timing', `${overlayStart.value}s → ${parseFloat(overlayStart.value) + parseFloat(overlayDuration.value)}s`);
  }

  // Metadata
  if (metaTitle.value) row('Title', metaTitle.value);
  if (metaArtist.value) row('Artist', metaArtist.value);
  if (metaAlbum.value) row('Album', metaAlbum.value);
  if (metaGenre.value) row('Genre', metaGenre.value);
  if (metaDate.value) row('Year', metaDate.value);

  row('End padding', parseFloat(endPadding.value) + 's');

  recapGrid.innerHTML = rows.join('');
  recapPanel.style.display = 'block';
}

function updateRecap() {
  if (visualPath && audioPath) {
    buildRecap();
  } else {
    recapPanel.style.display = 'none';
  }
}

// --- Render ---
renderBtn.addEventListener('click', async () => {
  buildRecap();
  const outputPath = await window.api.pickOutput();
  if (!outputPath) return;

  renderBtn.disabled = true;
  renderBtn.textContent = 'Creating your video...';
  progressArea.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = 'Starting...';
  result.style.display = 'none';

  let progress = 0;
  const pulse = setInterval(() => {
    progress = Math.min(progress + 0.5, 90);
    progressFill.style.width = `${progress}%`;
  }, 200);

  const res = await window.api.render({
    visualPath,
    visualType,
    audioPath,
    outputPath,
    overlayPath: overlayPath || null,
    overlayPosition: overlayPosition.value,
    overlayCustomX: customOverlayX,
    overlayCustomY: customOverlayY,
    overlaySize: parseInt(overlaySize.value),
    overlayOpacity: parseFloat(overlayOpacity.value),
    overlayStart: parseFloat(overlayStart.value),
    overlayDuration: parseFloat(overlayDuration.value),
    overlayTransition: overlayTransition.value,
    endPadding: parseFloat(endPadding.value),
    resolution: resolution.value,
    audioBitrate: audioBitrate.value,
    videoBitrate: parseInt(videoBitrate.value),
    crf: parseInt(crf.value),
    grain: parseInt(grain.value),
    contrast: parseFloat(contrast.value),
    brightness: parseFloat(brightness.value),
    metaTitle: metaTitle.value,
    metaArtist: metaArtist.value,
    metaAlbum: metaAlbum.value,
    metaGenre: metaGenre.value,
    metaDate: metaDate.value,
    metaComment: metaComment.value
  });

  clearInterval(pulse);

  if (res.success) {
    progressFill.style.width = '100%';
    progressText.textContent = 'Done!';
    result.className = 'result success';
    result.textContent = 'Your video is ready! Saved to:\n' + res.output;
    result.style.display = 'block';
  } else {
    progressFill.style.width = '0%';
    progressText.textContent = '';
    result.className = 'result error';
    result.textContent = friendlyError(res.error);
    result.style.display = 'block';
  }

  renderBtn.disabled = false;
  renderBtn.textContent = 'Create Video';
  updateRenderBtn();
});

// Progress updates from main process
window.api.onProgress((data) => {
  progressText.textContent = `Working... ${Math.floor(data.seconds)}s processed`;
});

// Auto-update notification
window.api.onUpdateStatus((msg) => {
  const bar = document.getElementById('updateBar');
  bar.textContent = msg;
  bar.style.display = 'block';
});

// Init
overlayPosition.value = 'custom';
updateSliderHints();
updateGuidance();
