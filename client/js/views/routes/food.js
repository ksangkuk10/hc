import { escapeHtml } from '../../utils/html.js';
import { fileToBase64 } from '../../utils/file.js';
import { compressFoodImageToMaxBytes } from '../../utils/imageCompress.js';

function attachFoodCameraHandlers(st, render, apiClient, loadFood) {
  window.startFoodCamera = async function () {
    const video = document.getElementById('food-video');
    const panel = document.getElementById('food-camera-panel');
    const hint = document.getElementById('food-camera-hint');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('이 브라우저에서는 카메라 API를 사용할 수 없습니다.');
      return;
    }
    try {
      if (st._stream) {
        st._stream.getTracks().forEach((t) => t.stop());
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
      if (hint) hint.textContent = '음식이 프레임에 들어오면 「촬영」을 누르세요.';
    } catch {
      alert('카메라를 켤 수 없습니다. 권한을 허용했는지 확인해 주세요.');
    }
  };

  window.snapFoodCamera = function () {
    const video = document.getElementById('food-video');
    const canvas = document.getElementById('food-canvas');
    const prev = document.getElementById('food-capture-preview');
    const hint = document.getElementById('food-camera-hint');
    if (!video || !video.srcObject || !canvas) {
      alert('먼저 「카메라 켜기」를 눌러 주세요.');
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      alert('영상이 준비될 때까지 잠시 후 다시 눌러 주세요.');
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
      hint.textContent = '촬영이 저장되었습니다. 「분석 및 기록」을 누르면 이 사진으로 AI 분석합니다.';
    }
  };

  window.stopFoodCamera = function () {
    const video = document.getElementById('food-video');
    const panel = document.getElementById('food-camera-panel');
    if (st._stream) {
      st._stream.getTracks().forEach((t) => t.stop());
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
      const t = fileEl.files[0].type;
      if (t && /^image\//.test(t)) imageMime = t;
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
          st._stream.getTracks().forEach((t) => t.stop());
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
        alert(e.message || '분석 실패');
      });
  };
}

export function createFoodPage(ctx) {
  const { render, api: apiClient, loadFood } = ctx;

  return {
    title: '음식 & 식단 분석',
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
        return "<div class='card'><i class='fa fa-spinner fa-spin'></i> 불러오는 중...</div>";
      }
      if (typeof st.cameraB64 === 'undefined') st.cameraB64 = null;
      attachFoodCameraHandlers(st, render, apiClient, loadFood);

      const hist = st.list || [];
      return (
        '<h2><i class="fa fa-bowl-food"></i> 음식 & 식단 분석</h2>' +
        '<p class="muted small">사진이 있으면 서버가 <strong>GitHub Models</strong>(<code>openai/gpt-4.1</code>)으로 음식을 추정·영양을 참고 추정합니다. 토큰 없거나 실패 시 해시 기반 데모값입니다. 이력에 저장되는 사진은 <strong>약 500KB 이하</strong>로 압축합니다. 의료 진단이 아닙니다.</p>' +
        '<div class="card">' +
        "<div class='section-label'><i class='fa fa-camera'></i> 웹캠으로 음식 촬영</div>" +
        '<p class="muted small">후면 카메라를 우선 시도합니다(없으면 전면).</p>' +
        '<div class="food-camera-actions">' +
        '<button type="button" class="btn-primary" onclick="startFoodCamera()">카메라 켜기</button>' +
        '<button type="button" class="btn-secondary" onclick="snapFoodCamera()">촬영</button>' +
        '<button type="button" class="btn-secondary" onclick="stopFoodCamera()">카메라 끄기</button>' +
        '</div>' +
        '<div id="food-camera-panel" style="display:none;margin-top:8px">' +
        '<video id="food-video" autoplay playsinline muted style="width:100%;max-width:480px;border-radius:12px;background:#ece8e4;display:block"></video>' +
        '<canvas id="food-canvas" style="display:none"></canvas>' +
        '<img id="food-capture-preview" alt="" style="display:none;width:100%;max-width:480px;border-radius:12px;margin-top:10px;border:2px solid #c4a9a9"/>' +
        '<p id="food-camera-hint" class="small" style="margin-top:10px;color:#8a8580"></p>' +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>음식명 입력</div>" +
        '<input id="food-label" class="wide" placeholder="예: 김치찌개, 샐러드 (AI 힌트로 사용 가능)" />' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>갤러리에서 선택</div>" +
        '<input type="file" id="food-file" accept="image/*" />' +
        '<p class="muted small">웹캠 촬영이 있으면 그것이 우선합니다.</p>' +
        `<button type="button" class="btn-primary" onclick="runFoodAnalyze()" ${st.analyzing ? 'disabled' : ''}>` +
        (st.analyzing ? '<i class="fa fa-spinner fa-spin"></i> 분석 중…' : '분석 및 기록') +
        '</button>' +
        '</div>' +
        (st.analyzing
          ? '<div class="card cond-analyzing-banner"><p style="margin:0"><i class="fa fa-circle-notch fa-spin"></i> <strong>분석 중입니다.</strong> 잠시만 기다려 주세요.</p></div>'
          : '') +
        '<div class="card">' +
        "<div class='section-label'>식단 이력</div>" +
        (hist.length
          ? `<ul class="hist-list">${hist
              .map((x) => {
                const tag =
                  x.source === 'github_models'
                    ? '<span style="background:#ebe6e1;color:#4a4540;padding:2px 8px;border-radius:6px;font-size:0.82rem;margin-left:6px">GitHub Models' +
                      (x.aiModel ? ' · ' + escapeHtml(x.aiModel) : '') +
                      '</span>'
                    : '<span style="opacity:0.85;font-size:0.82rem;margin-left:6px">(데모)</span>';
                const when = x.at
                  ? new Date(x.at).toLocaleString('ko-KR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '—';
                const mime = x.imageMime && /^image\//.test(x.imageMime) ? x.imageMime : 'image/jpeg';
                const thumb =
                  x.imageBase64 && String(x.imageBase64).length > 0
                    ? `<div style="margin:10px 0"><img src="data:${mime};base64,${String(x.imageBase64).replace(/"/g, '')}" alt="" style="max-width:240px;max-height:240px;border-radius:12px;object-fit:cover;border:1px solid #e8e2dc;box-shadow:0 2px 12px rgba(28,24,22,0.08)"/></div>`
                    : '<p class="muted small" style="margin:8px 0 0">저장된 사진 없음 (텍스트만 분석 또는 이미지 용량 한도 초과)</p>';
                const n = x.nutrition || {};
                return (
                  `<li style="padding-bottom:16px">` +
                  `<div class="muted small" style="margin-bottom:8px"><i class="fa fa-calendar"></i> 기록일시: <strong style="color:#9a7b7b">${escapeHtml(when)}</strong></div>` +
                  thumb +
                  `<strong>${escapeHtml(x.label)}</strong>${tag}<br/>` +
                  `${n.kcal != null ? n.kcal : '—'}kcal · 단백질 ${n.proteinG != null ? n.proteinG : '—'}g · 나트륨 약 ${n.sodiumMg != null ? n.sodiumMg : '—'}mg<br/>` +
                  `<span class="muted">${escapeHtml(x.advice || '')}</span>` +
                  (x.note
                    ? `<div class="muted small" style="margin-top:6px;white-space:pre-wrap">${escapeHtml(x.note)}</div>`
                    : '') +
                  '</li>'
                );
              })
              .join('')}</ul>`
          : '<p class="muted">기록이 없습니다.</p>') +
        '</div>'
      );
    },
  };
}
