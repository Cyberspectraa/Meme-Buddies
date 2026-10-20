// Testable, platform-independent geometry for TikTok portrait desktop capture.
function boundsForLayout(bounds, layout = 'portrait') {
  if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)
    || bounds.width <= 0 || bounds.height <= 0) throw new Error('Invalid display dimensions');
  if (layout === 'full') return { ...bounds };
  if (layout !== 'portrait') throw new Error('Invalid layout');
  const width = Math.max(1, Math.min(bounds.width, Math.floor(bounds.height * 9 / 16)));
  return { x: bounds.x + Math.floor((bounds.width - width) / 2), y: bounds.y, width, height: bounds.height };
}
module.exports = { boundsForLayout };
