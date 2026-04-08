/**
 * Shared hex color → HSL conversion utilities.
 * Used by crossvalidation, hook, and display modules.
 */

/** Full RGB→HSL conversion. Returns [hue 0-360, saturation 0-1, lightness 0-1]. */
export function rgbToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

/** Extract lightness (0-100) from hex color. */
export function hexToLightness(hex: string): number {
  return rgbToHsl(hex)[2] * 100;
}

/** Extract hue (0-360) from hex color. */
export function hexToHue(hex: string): number {
  return rgbToHsl(hex)[0];
}
