import { escapeHtml } from '../../utils/html.js';
import { chartBars } from '../../utils/chart.js';
import { fileToBase64 } from '../../utils/file.js';

function attachConditionCameraHandlers(st, render, apiClient) {
  window.startConditionCamera = async function () {
    const video = document.getElementById('cond-video');
    const panel = document.getElementById('cond-camera-panel');
    const hint = document.getElementById('cond-camera-hint');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('이 브라우저에서는 카메라 API를 사용할 수 없습니다.');
      return;
    }
    try {
      if (st._stream) {
        st._stream.getTracks().forEach((t) => t.stop());
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
        hint.textContent = '얼굴이 프레임에 들어오면 「촬영」을 누르세요.';
      }
    } catch (e) {
      alert('카메라를 켤 수 없습니다. 권한을 허용했는지, 다른 앱이 카메라를 쓰고 있지 않은지 확인해 주세요.');
    }
  };

  window.snapConditionCamera = function () {
    const video = document.getElementById('cond-video');
    const canvas = document.getElementById('cond-canvas');
    const prev = document.getElementById('cond-capture-preview');
    const hint = document.getElementById('cond-camera-hint');
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
      hint.textContent = '촬영이 저장되었습니다. 「분석하기」를 누르면 이 사진으로 분석합니다.';
    }
  };

  window.stopConditionCamera = function () {
    const video = document.getElementById('cond-video');
    const panel = document.getElementById('cond-camera-panel');
    if (st._stream) {
      st._stream.getTracks().forEach((t) => t.stop());
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
    const fat = document.getElementById('fatigue-self');
    const v = fat ? fat.value : '';
    const fileEl = document.getElementById('face-file');
    const useCamera = st.cameraB64;
    const p = useCamera
      ? Promise.resolve(st.cameraB64)
      : fileEl && fileEl.files && fileEl.files[0]
        ? fileToBase64(fileEl.files[0])
        : Promise.resolve(null);
    p.then((b64) =>
      apiClient('/api/condition/analyze', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: b64, fatigueSelf: v }),
      }),
    )
      .then(() => {
        st.cameraB64 = null;
        if (st._stream) {
          st._stream.getTracks().forEach((t) => t.stop());
          st._stream = null;
        }
        const video = document.getElementById('cond-video');
        if (video) video.srcObject = null;
        const panel = document.getElementById('cond-camera-panel');
        if (panel) panel.style.display = 'none';
        st.loading = true;
        st.list = null;
        window._hcDash = { loading: true };
        render();
      })
      .catch((e) => {
        alert(e.message || '분석 실패');
      });
  };
}

export function createConditionPage(ctx) {
  const { render, api: apiClient, loadCondition } = ctx;

  return {
    title: '컨디션 분석',
    render() {
      if (!window._hcCond) {
        window._hcCond = { list: null, loading: true, cameraB64: null, _stream: null };
      }
      const st = window._hcCond;
      if (st.loading && st.list === null) {
        loadCondition().then((list) => {
          st.list = list;
          st.loading = false;
          render();
        });
        return "<div class='card'><i class='fa fa-spinner fa-spin'></i> 불러오는 중...</div>";
      }
      if (typeof st.cameraB64 === 'undefined') st.cameraB64 = null;
      attachConditionCameraHandlers(st, render, apiClient);

      const hist = (st.list || []).slice(0, 14);
      const fatigueTrend = hist.map((x) => x.fatigue).reverse();
      const trendLbl = hist
        .map((x) => new Date(x.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }))
        .reverse();

      return (
        '<h2><i class="fa fa-face-smile-beam"></i> 컨디션 분석</h2>' +
        '<p class="muted small">사진이 있으면 서버가 <strong>GitHub Models</strong>(<code>openai/gpt-4.1</code>, 환경변수 <code>GITHUB_TOKEN</code> 등)으로 웰니스 관점 분석을 시도합니다. 토큰이 없거나 API 오류 시 데모 추정값으로 대체됩니다. 의료 진단이 아닙니다. HTTPS 또는 localhost에서 카메라를 사용할 수 있습니다.</p>' +
        '<div class="card">' +
        "<div class='section-label'><i class='fa fa-camera'></i> 웹캠으로 촬영</div>" +
        '<p class="muted small">PC·모바일 브라우저에서 전면 카메라로 바로 찍어 분석할 수 있습니다.</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px">' +
        '<button type="button" class="btn-primary" onclick="startConditionCamera()">카메라 켜기</button>' +
        '<button type="button" class="btn-secondary" onclick="snapConditionCamera()">촬영</button>' +
        '<button type="button" class="btn-secondary" onclick="stopConditionCamera()">카메라 끄기</button>' +
        '</div>' +
        '<div id="cond-camera-panel" style="display:none;margin-top:8px">' +
        '<video id="cond-video" autoplay playsinline muted style="width:100%;max-width:480px;border-radius:12px;background:#0a1520;display:block"></video>' +
        '<canvas id="cond-canvas" style="display:none"></canvas>' +
        '<img id="cond-capture-preview" alt="" style="display:none;width:100%;max-width:480px;border-radius:12px;margin-top:10px;border:2px solid #22d6b1"/>' +
        '<p id="cond-camera-hint" class="small" style="margin-top:10px;color:#a8e8d8"></p>' +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>갤러리에서 선택</div>" +
        '<input type="file" id="face-file" accept="image/*" />' +
        '<p class="muted small">웹캠 촬영을 쓰지 않을 때만 파일을 선택하세요. 촬영한 사진이 있으면 그것이 우선합니다.</p>' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>피로도 & 분석</div>" +
        '<label>주관적 피로 (1–10)</label> ' +
        '<input type="range" id="fatigue-self" min="1" max="10" value="5" style="width:200px;vertical-align:middle" oninput="document.getElementById(\'fatigue-self-val\').textContent=this.value"/>' +
        ' <strong id="fatigue-self-val" style="color:#3af2cf;font-size:1.1rem">5</strong>' +
        '<span class="muted small" style="margin-left:6px">/10</span>' +
        '<button type="button" class="btn-primary" style="margin-left:12px" onclick="runConditionAnalyze()">분석하기</button>' +
        '</div>' +
        (fatigueTrend.length
          ? `<div class="card"><div class="section-label">피로 지수 추세 (최근 기록)</div>${chartBars(fatigueTrend, trendLbl, '#f0c040')}</div>`
          : '') +
        '<div class="card">' +
        "<div class='section-label'>기록</div>" +
        (hist.length
          ? `<ul class="hist-list">${hist
              .map((x) => {
                const tag =
                  x.source === 'github_models'
                    ? '<span style="background:#1a4d4a;padding:2px 8px;border-radius:6px;font-size:0.82rem;margin-left:6px">GitHub Models' +
                      (x.aiModel ? ' · ' + escapeHtml(x.aiModel) : '') +
                      '</span>'
                    : '<span style="opacity:0.85;font-size:0.82rem;margin-left:6px">(데모)</span>';
                const selfPart =
                  x.fatigueSelf != null && x.fatigueSelf !== ''
                    ? `주관적 피로 <b>${escapeHtml(String(x.fatigueSelf))}/10</b> · `
                    : '주관적 피로 <b>—</b> · ';
                return (
                  `<li><strong>${new Date(x.at).toLocaleString('ko-KR')}</strong>${tag}<br/>${selfPart}분석 피로 ${x.fatigue} · 피부 ${escapeHtml(x.skin)} · ${escapeHtml(x.mood)}` +
                  `<div class="muted small" style="margin-top:8px;white-space:pre-wrap">${escapeHtml(x.note || '')}</div></li>`
                );
              })
              .join('')}</ul>`
          : '<p class="muted">기록이 없습니다.</p>') +
        '</div>'
      );
    },
  };
}
