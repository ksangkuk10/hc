import { escapeHtml } from './html.js';

/**
 * @param {number[]} values
 * @param {string[]} labels
 * @param {string} color
 * @param {number} [fixedSlotCount] — divide chart width into this many equal slots (left-aligned).
 *   Omit to use values.length.
 * @param {number} [barWidthRatio=1] — bar width as a fraction of the slot bar area (e.g. 0.5 = half width), centered in slot.
 * @param {number} [extraLabelGapPx=0] — extra pixels between bar bottoms and date labels (extends SVG height).
 */
export function chartBars(values, labels, color, fixedSlotCount, barWidthRatio, extraLabelGapPx) {
  const w = 280;
  const chartH = 90;
  const n = values.length;
  const extraGap =
    typeof extraLabelGapPx === 'number' && extraLabelGapPx >= 0 ? extraLabelGapPx : 0;
  const svgH = chartH + extraGap;
  if (n === 0) {
    return `<svg width="${w}" height="${chartH}" viewBox="0 0 ${w} ${chartH}" style="max-width:100%"></svg>`;
  }
  const max = Math.max(...values, 1);
  const innerW = w - 20;
  const slotCount =
    typeof fixedSlotCount === 'number' && fixedSlotCount > 0 ? fixedSlotCount : n;
  const slotW = innerW / slotCount;
  const ratio =
    typeof barWidthRatio === 'number' && barWidthRatio > 0 && barWidthRatio <= 1
      ? barWidthRatio
      : 1;
  const slotBarMax = Math.max(2, slotW - 2);
  const bw = Math.max(2, Math.round(slotBarMax * ratio));
  const labelY = chartH - 2 + extraGap;
  let rects = '';
  for (let i = 0; i < n; i++) {
    const v = values[i];
    const bh = Math.round((v / max) * (chartH - 24));
    const x = 10 + i * slotW + (slotW - bw) / 2;
    const y = chartH - 8 - bh;
    rects += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${color}" opacity="0.85"/>`;
    rects += `<text x="${x + bw / 2}" y="${labelY}" font-size="9" fill="#6b6b6b" text-anchor="middle">${escapeHtml(labels[i])}</text>`;
  }
  return `<svg width="${w}" height="${svgH}" viewBox="0 0 ${w} ${svgH}" style="max-width:100%">${rects}</svg>`;
}
