import { escapeHtml } from '../../utils/html.js';
import { chartBars } from '../../utils/chart.js';
import { fileToBase64 } from '../../utils/file.js';

function attachConditionCameraHandlers(st, render, apiClient, loadCondition, t) {
  window.startConditionCamera = async function () {
    const video = document.getElementById('cond-video');
    const panel = document.getElementById('cond-camera-panel');
    const hint = document.getElementById('cond-camera-hint');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(t('condition.cameraNoApi'));
      return;
    }
    try {
      if (st._stream) {
        st._stream.getTracks().forEach((tr) => tr.stop());
        st._stream = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      st._stream = stream;
      st.cameraB64 = null;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.muted = true;
        try {
          await video.play();
        } catch {
          /* 일부 브라우저는 사용자 제스처 후 재생 */
        }
      }
      if (panel) panel.style.display = 'block';
      const prev = document.getElementById('cond-capture-preview');
      if (prev) {
        prev.style.display = 'none';
        prev.removeAttribute('src');
      }
      if (hint) {
        hint.textContent = t('condition.hintFaceFrame');
      }
    } catch {
      alert(t('condition.cameraFail'));
    }
  };

  window.snapConditionCamera = function () {
    const video = document.getElementById('cond-video');
    const canvas = document.getElementById('cond-canvas');
    const prev = document.getElementById('cond-capture-preview');
    const hint = document.getElementById('cond-camera-hint');
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
      hint.textContent = t('condition.hintCaptured');
    }
  };

  window.stopConditionCamera = function () {
    const video = document.getElementById('cond-video');
    const panel = document.getElementById('cond-camera-panel');
    if (st._stream) {
      st._stream.getTracks().forEach((tr) => tr.stop());
      st._stream = null;
    }
    if (video) video.srcObject = null;
    if (panel) panel.style.display = 'none';
    st.cameraB64 = null;
    const prev = document.getElementById('cond-capture-preview');
    if (prev) {
      prev.style.display = 'none';
      prev.removeAttribute('src');
    }
    const hint = document.getElementById('cond-camera-hint');
    if (hint) hint.textContent = '';
  };

  window.runConditionAnalyze = function () {
    if (st.analyzing) return;
    const fat = document.getElementById('fatigue-self');
    const v = fat ? fat.value : '';
    const fileEl = document.getElementById('face-file');
    const useCamera = st.cameraB64;
    const p = useCamera
      ? Promise.resolve(st.cameraB64)
      : fileEl && fileEl.files && fileEl.files[0]
        ? fileToBase64(fileEl.files[0])
        : Promise.resolve(null);
    st.analyzing = true;
    render();
    p.then((b64) =>
      apiClient('/api/condition/analyze', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: b64, fatigueSelf: v }),
      }),
    )
      .then(() => {
        st.analyzing = false;
        st.cameraB64 = null;
        if (st._stream) {
          st._stream.getTracks().forEach((tr) => tr.stop());
          st._stream = null;
        }
        const video = document.getElementById('cond-video');
        if (video) video.srcObject = null;
        const panel = document.getElementById('cond-camera-panel');
        if (panel) panel.style.display = 'none';
        window._hcDash = { loading: true };
        return loadCondition();
      })
      .then((list) => {
        st.list = Array.isArray(list) ? list : [];
        st.loading = false;
        render();
      })
      .catch((e) => {
        st.analyzing = false;
        render();
        alert(e.message || t('condition.fail'));
      });
  };
}

export function createConditionPage(ctx) {
  const { render, api: apiClient, loadCondition, t, getDateLocale } = ctx;
  const dl = getDateLocale();

  return {
    title: 'Condition',
    render() {
      if (!window._hcCond) {
        window._hcCond = {
          list: null,
          loading: true,
          analyzing: false,
          cameraB64: null,
          _stream: null,
        };
      }
      const st = window._hcCond;
      if (typeof st.analyzing !== 'boolean') st.analyzing = false;
      if (st.loading && st.list === null && !st.analyzing) {
        loadCondition().then((list) => {
          st.list = list;
          st.loading = false;
          render();
        });
        return `<div class='card'><i class='fa fa-spinner fa-spin'></i> ${escapeHtml(t('common.loading'))}</div>`;
      }
      if (typeof st.cameraB64 === 'undefined') st.cameraB64 = null;
      attachConditionCameraHandlers(st, render, apiClient, loadCondition, t);

      const hist = (st.list || []).slice(0, 14);
      const fatigueTrend = hist.map((x) => x.fatigue).reverse();
      const trendLbl = hist
        .map((x) => new Date(x.at).toLocaleDateString(dl, { month: 'numeric', day: 'numeric' }))
        .reverse();

      return (
        `<h2><i class="fa fa-face-smile-beam"></i> ${escapeHtml(t('condition.title'))}</h2>` +
        `<p class="muted small">${escapeHtml(t('condition.intro'))}</p>` +
        '<div class="card">' +
        `<div class='section-label'><i class='fa fa-camera'></i> ${escapeHtml(t('condition.webcam'))}</div>` +
        `<p class="muted small">${escapeHtml(t('condition.webcamHint'))}</p>` +
        '<div class="cond-camera-actions">' +
        `<button type="button" class="btn-primary" onclick="startConditionCamera()">${escapeHtml(t('condition.camOn'))}</button>` +
        `<button type="button" class="btn-secondary" onclick="snapConditionCamera()">${escapeHtml(t('condition.snap'))}</button>` +
        `<button type="button" class="btn-secondary" onclick="stopConditionCamera()">${escapeHtml(t('condition.camOff'))}</button>` +
        '</div>' +
        '<div id="cond-camera-panel" style="display:none;margin-top:8px">' +
        '<video id="cond-video" autoplay playsinline muted style="width:100%;max-width:480px;border-radius:12px;background:#ece8e4;display:block"></video>' +
        '<canvas id="cond-canvas" style="display:none"></canvas>' +
        '<img id="cond-capture-preview" alt="" style="display:none;width:100%;max-width:480px;border-radius:12px;margin-top:10px;border:2px solid #c4a9a9"/>' +
        '<p id="cond-camera-hint" class="small" style="margin-top:10px;color:#8a8580"></p>' +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('condition.gallery'))}</div>` +
        '<input type="file" id="face-file" accept="image/*" />' +
        `<p class="muted small">${escapeHtml(t('condition.galleryHint'))}</p>` +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('condition.fatigueTitle'))}</div>` +
        `<label>${escapeHtml(t('condition.fatigueLabel'))}</label> ` +
        '<input type="range" id="fatigue-self" min="1" max="10" value="5" style="width:200px;vertical-align:middle" oninput="document.getElementById(\'fatigue-self-val\').textContent=this.value"/>' +
        ' <strong id="fatigue-self-val" style="color:#9a7b7b;font-size:1.1rem">5</strong>' +
        '<span class="muted small" style="margin-left:6px">/10</span>' +
        `<button type="button" class="btn-primary" style="margin-left:12px" onclick="runConditionAnalyze()" ${st.analyzing ? 'disabled' : ''}>` +
        (st.analyzing ? `<i class="fa fa-spinner fa-spin"></i> ${escapeHtml(t('condition.analyzing'))}` : escapeHtml(t('condition.analyze'))) +
        '</button>' +
        '</div>' +
        (st.analyzing
          ? `<div class="card cond-analyzing-banner"><p style="margin:0"><i class="fa fa-circle-notch fa-spin"></i> <strong>${escapeHtml(t('condition.analyzingBanner'))}</strong></p></div>`
          : '') +
        (fatigueTrend.length
          ? `<div class="card"><div class="section-label">${escapeHtml(t('condition.trend'))}</div>${chartBars(fatigueTrend, trendLbl, '#b8956c', 14)}</div>`
          : '') +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('condition.history'))}</div>` +
        (hist.length
          ? `<ul class="hist-list">${hist
              .map((x) => {
                const tag =
                  x.source === 'github_models'
                    ? '<span style="background:#ebe6e1;color:#4a4540;padding:2px 8px;border-radius:6px;font-size:0.82rem;margin-left:6px">' +
                      escapeHtml(t('condition.githubTag')) +
                      (x.aiModel ? ' · ' + escapeHtml(x.aiModel) : '') +
                      '</span>'
                    : `<span style="opacity:0.85;font-size:0.82rem;margin-left:6px">${escapeHtml(t('condition.demoTag'))}</span>`;
                const selfPart =
                  x.fatigueSelf != null && x.fatigueSelf !== ''
                    ? `${escapeHtml(t('condition.subjectShort'))} <b>${escapeHtml(String(x.fatigueSelf))}/10</b> · `
                    : `${escapeHtml(t('condition.subjectShort'))} <b>${escapeHtml(t('common.none'))}</b> · `;
                return (
                  `<li><strong>${escapeHtml(new Date(x.at).toLocaleString(dl))}</strong>${tag}<br/>${selfPart}${escapeHtml(t('condition.analysisShort'))} ${x.fatigue} · ${escapeHtml(t('dashboard.skin'))} ${escapeHtml(x.skin)} · ${escapeHtml(x.mood)}` +
                  `<div class="muted small" style="margin-top:8px;white-space:pre-wrap">${escapeHtml(x.note || '')}</div></li>`
                );
              })
              .join('')}</ul>`
          : `<p class="muted">${escapeHtml(t('condition.noHistory'))}</p>`) +
        '</div>'
      );
    },
  };
}
