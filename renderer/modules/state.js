/**
 * VideoRender — Application state
 * Shared mutable state for the renderer process.
 * @author TxTony
 */

const state = {
  visualPath: null,
  visualType: null,
  audioPath: null,
  overlayPath: null,
  customOverlayX: 50,
  customOverlayY: 50,
  visualBlobUrl: null,
  overlayBlobUrl: null,
  isRendering: false
};

export default state;
