import { escapeHtml } from './html.js';

export function chartBars(values, labels, color) {
  const max = Math.max(...values, 1);
  const w = 280;
  const h = 90;
  const n = values.length;
  const bw = Math.floor((w - 20) / n) - 2;
  let rects = '';
  for (let i = 0; i < n; i++) {
    const v = values[i];
    const bh = Math.round((v / max) * (h - 24));
    const x = 10 + i * (bw + 2);
    const y = h - 8 - bh;
    rects += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${color}" opacity="0.85"/>`;
    rects += `<text x="${x + bw / 2}" y="${h - 2}" font-size="9" fill="#a8e0d8" text-anchor="middle">${escapeHtml(labels[i])}</text>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="max-width:100%">${rects}</svg>`;
}
