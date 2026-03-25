/**
 * Canvas로 JPEG 압축 · 축소하여 바이너리 기준 maxBytes 이하로 맞춤 (기본 500KB)
 * @param {string} base64Plain - 순수 base64 (data URL 아님)
 * @param {string} mimeType - 원본 MIME
 * @returns {Promise<{ base64: string, mime: string }>}
 */
export async function compressFoodImageToMaxBytes(base64Plain, mimeType = 'image/jpeg', maxBytes = 500 * 1024) {
  const clean = String(base64Plain || '').replace(/^data:image\/\w+;base64,/, '').trim();
  if (!clean) {
    return { base64: '', mime: 'image/jpeg' };
  }

  const dataUrl = /^data:/.test(String(base64Plain))
    ? String(base64Plain)
    : `data:${mimeType || 'image/jpeg'};base64,${clean}`;

  const img = await loadImage(dataUrl);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) {
    return { base64: clean, mime: mimeType || 'image/jpeg' };
  }

  const maxSide = 1920;
  if (w > maxSide || h > maxSide) {
    const r = Math.min(maxSide / w, maxSide / h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  function draw() {
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
  }
  draw();

  for (let round = 0; round < 12; round++) {
    for (let q = 0.92; q >= 0.28; q -= 0.06) {
      const blob = await canvasToJpegBlob(canvas, q);
      if (blob && blob.size <= maxBytes) {
        const b64 = await blobToBase64(blob);
        return { base64: b64, mime: 'image/jpeg' };
      }
    }
    w = Math.max(240, Math.round(w * 0.82));
    h = Math.max(240, Math.round(h * 0.82));
    draw();
  }

  let q = 0.25;
  while (w > 120) {
    for (let qq = q; qq >= 0.2; qq -= 0.05) {
      const blob = await canvasToJpegBlob(canvas, qq);
      if (blob && blob.size <= maxBytes) {
        const b64 = await blobToBase64(blob);
        return { base64: b64, mime: 'image/jpeg' };
      }
    }
    w = Math.max(120, Math.round(w * 0.75));
    h = Math.max(120, Math.round(h * 0.75));
    draw();
  }

  const last = await canvasToJpegBlob(canvas, 0.2);
  if (last) {
    const b64 = await blobToBase64(last);
    return { base64: b64, mime: 'image/jpeg' };
  }
  return { base64: clean, mime: mimeType || 'image/jpeg' };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    i.src = src;
  });
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const x = String(r.result || '');
      const i = x.indexOf('base64,');
      resolve(i >= 0 ? x.slice(i + 7) : x);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
