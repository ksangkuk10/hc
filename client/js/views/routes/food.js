import { escapeHtml } from '../../utils/html.js';
import { fileToBase64 } from '../../utils/file.js';
import { compressFoodImageToMaxBytes } from '../../utils/imageCompress.js';

function attachFoodCameraHandlers(st, render, apiClient, loadFood, t) {
  window.startFoodCamera = async function () {
    const video = document.getElementById('food-video');
    const panel = document.getElementById('food-camera-panel');
    const hint = document.getElementById('food-camera-hint');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(t('food.cameraNoApi'));
      return;
    }
    try {
      if (st._stream) {
        st._stream.getTracks().forEach((tr) => tr.stop());
        st._stream = null;
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
      }
      st._stream = stream;
      st.cameraB64 = null;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.muted = true;
        try {
          await video.play();
        } catch {
          /* */
        }
      }
      if (panel) panel.style.display = 'block';
      const prev = document.getElementById('food-capture-preview');
      if (prev) {
        prev.style.display = 'none';
        prev.removeAttribute('src');
      }
      if (hint) hint.textContent = t('food.hintFoodFrame');
    } catch {
      alert(t('food.cameraFail'));
    }
  };

  window.snapFoodCamera = function () {
    const video = document.getElementById('food-video');
    const canvas = document.getElementById('food-canvas');
    const prev = document.getElementById('food-capture-preview');
    const hint = document.getElementById('food-camera-hint');
    if (!video || !video.srcObject || !canvas) {
      alert(t('condition.camFirst'));
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      alert(t('condition.videoWait'));
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext('2d');
    c.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const i = dataUrl.indexOf('base64,');
    st.cameraB64 = i >= 0 ? dataUrl.slice(i + 7) : null;
    if (prev) {
      prev.src = dataUrl;
      prev.style.display = 'block';
    }
    if (hint) {
      hint.textContent = t('food.hintCaptured');
    }
  };

  window.stopFoodCamera = function () {
    const video = document.getElementById('food-video');
    const panel = document.getElementById('food-camera-panel');
    if (st._stream) {
      st._stream.getTracks().forEach((tr) => tr.stop());
      st._stream = null;
    }
    if (video) video.srcObject = null;
    if (panel) panel.style.display = 'none';
    st.cameraB64 = null;
    const prev = document.getElementById('food-capture-preview');
    if (prev) {
      prev.style.display = 'none';
      prev.removeAttribute('src');
    }
    const hint = document.getElementById('food-camera-hint');
    if (hint) hint.textContent = '';
  };

  window.runFoodAnalyze = function () {
    if (st.analyzing) return;
    const label = document.getElementById('food-label').value;
    const fileEl = document.getElementById('food-file');
    const useCamera = st.cameraB64;
    let imageMime = 'image/jpeg';
    if (!useCamera && fileEl && fileEl.files && fileEl.files[0]) {
      const ty = fileEl.files[0].type;
      if (ty && /^image\//.test(ty)) imageMime = ty;
    }
    const p = useCamera
      ? Promise.resolve(st.cameraB64)
      : fileEl && fileEl.files && fileEl.files[0]
        ? fileToBase64(fileEl.files[0])
        : Promise.resolve(null);
    st.analyzing = true;
    render();
    p.then(async (b64) => {
      const payload = { label, imageBase64: null, imageMime: 'image/jpeg' };
      if (b64) {
        const { base64, mime } = await compressFoodImageToMaxBytes(b64, imageMime, 500 * 1024);
        payload.imageBase64 = base64 || null;
        payload.imageMime = mime || 'image/jpeg';
      }
      return apiClient('/api/food/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    })
      .then(() => {
        st.analyzing = false;
        st.cameraB64 = null;
        if (st._stream) {
          st._stream.getTracks().forEach((tr) => tr.stop());
          st._stream = null;
        }
        const video = document.getElementById('food-video');
        if (video) video.srcObject = null;
        const panel = document.getElementById('food-camera-panel');
        if (panel) panel.style.display = 'none';
        window._hcDash = { loading: true };
        return loadFood();
      })
      .then((list) => {
        st.list = Array.isArray(list) ? list : [];
        st.loading = false;
        render();
      })
      .catch((e) => {
        st.analyzing = false;
        render();
        alert(e.message || t('food.fail'));
      });
  };
}

export function createFoodPage(ctx) {
  const { render, api: apiClient, loadFood, t, getDateLocale } = ctx;
  const dl = getDateLocale();

  return {
    title: 'Food',
    render() {
      if (!window._hcFood) {
        window._hcFood = {
          list: null,
          loading: true,
          analyzing: false,
          cameraB64: null,
          _stream: null,
        };
      }
      const st = window._hcFood;
      if (typeof st.analyzing !== 'boolean') st.analyzing = false;
      if (st.loading && st.list === null && !st.analyzing) {
        loadFood().then((list) => {
          st.list = list;
          st.loading = false;
          render();
        });
        return `<div class='card'><i class='fa fa-spinner fa-spin'></i> ${escapeHtml(t('common.loading'))}</div>`;
      }
      if (typeof st.cameraB64 === 'undefined') st.cameraB64 = null;
      attachFoodCameraHandlers(st, render, apiClient, loadFood, t);

      const hist = st.list || [];
      return (
        `<h2><i class="fa fa-bowl-food"></i> ${escapeHtml(t('food.title'))}</h2>` +
        `<p class="muted small">${escapeHtml(t('food.intro'))}</p>` +
        '<div class="card">' +
        `<div class='section-label'><i class='fa fa-camera'></i> ${escapeHtml(t('food.webcam'))}</div>` +
        `<p class="muted small">${escapeHtml(t('food.webcamHint'))}</p>` +
        '<div class="food-camera-actions">' +
        `<button type="button" class="btn-primary" onclick="startFoodCamera()">${escapeHtml(t('condition.camOn'))}</button>` +
        `<button type="button" class="btn-secondary" onclick="snapFoodCamera()">${escapeHtml(t('condition.snap'))}</button>` +
        `<button type="button" class="btn-secondary" onclick="stopFoodCamera()">${escapeHtml(t('condition.camOff'))}</button>` +
        '</div>' +
        '<div id="food-camera-panel" style="display:none;margin-top:8px">' +
        '<video id="food-video" autoplay playsinline muted style="width:100%;max-width:480px;border-radius:12px;background:#ece8e4;display:block"></video>' +
        '<canvas id="food-canvas" style="display:none"></canvas>' +
        '<img id="food-capture-preview" alt="" style="display:none;width:100%;max-width:480px;border-radius:12px;margin-top:10px;border:2px solid #c4a9a9"/>' +
        '<p id="food-camera-hint" class="small" style="margin-top:10px;color:#8a8580"></p>' +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('food.labelTitle'))}</div>` +
        `<input id="food-label" class="wide" placeholder="${escapeHtml(t('food.labelPh'))}" />` +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('food.gallery'))}</div>` +
        '<input type="file" id="food-file" accept="image/*" />' +
        `<p class="muted small">${escapeHtml(t('food.galleryHint'))}</p>` +
        `<button type="button" class="btn-primary" onclick="runFoodAnalyze()" ${st.analyzing ? 'disabled' : ''}>` +
        (st.analyzing ? `<i class="fa fa-spinner fa-spin"></i> ${escapeHtml(t('food.analyzing'))}` : escapeHtml(t('food.analyzeBtn'))) +
        '</button>' +
        '</div>' +
        (st.analyzing
          ? `<div class="card cond-analyzing-banner"><p style="margin:0"><i class="fa fa-circle-notch fa-spin"></i> <strong>${escapeHtml(t('condition.analyzingBanner'))}</strong></p></div>`
          : '') +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('food.history'))}</div>` +
        (hist.length
          ? `<ul class="hist-list">${hist
              .map((x) => {
                const tag =
                  x.source === 'github_models'
                    ? '<span style="background:#ebe6e1;color:#4a4540;padding:2px 8px;border-radius:6px;font-size:0.82rem;margin-left:6px">' +
                      escapeHtml(t('food.githubTag')) +
                      (x.aiModel ? ' · ' + escapeHtml(x.aiModel) : '') +
                      '</span>'
                    : `<span style="opacity:0.85;font-size:0.82rem;margin-left:6px">${escapeHtml(t('food.demoTag'))}</span>`;
                const when = x.at
                  ? new Date(x.at).toLocaleString(dl, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : t('common.none');
                const mime = x.imageMime && /^image\//.test(x.imageMime) ? x.imageMime : 'image/jpeg';
                const thumb =
                  x.imageBase64 && String(x.imageBase64).length > 0
                    ? `<div style="margin:10px 0"><img src="data:${mime};base64,${String(x.imageBase64).replace(/"/g, '')}" alt="" style="max-width:240px;max-height:240px;border-radius:12px;object-fit:cover;border:1px solid #e8e2dc;box-shadow:0 2px 12px rgba(28,24,22,0.08)"/></div>`
                    : `<p class="muted small" style="margin:8px 0 0">${escapeHtml(t('food.noThumb'))}</p>`;
                const n = x.nutrition || {};
                return (
                  `<li style="padding-bottom:16px">` +
                  `<div class="muted small" style="margin-bottom:8px"><i class="fa fa-calendar"></i> ${escapeHtml(t('food.recorded'))} <strong style="color:#9a7b7b">${escapeHtml(when)}</strong></div>` +
                  thumb +
                  `<strong>${escapeHtml(x.label)}</strong>${tag}<br/>` +
                  `${n.kcal != null ? n.kcal : '—'}kcal · ${escapeHtml(t('food.proteinShort'))} ${n.proteinG != null ? n.proteinG : '—'}g · ${escapeHtml(t('food.sodiumShort'))} ${n.sodiumMg != null ? n.sodiumMg : '—'}mg<br/>` +
                  `<span class="muted">${escapeHtml(x.advice || '')}</span>` +
                  (x.note
                    ? `<div class="muted small" style="margin-top:6px;white-space:pre-wrap">${escapeHtml(x.note)}</div>`
                    : '') +
                  '</li>'
                );
              })
              .join('')}</ul>`
          : `<p class="muted">${escapeHtml(t('food.noHistory'))}</p>`) +
        '</div>'
      );
    },
  };
}
