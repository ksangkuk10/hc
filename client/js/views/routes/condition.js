import { escapeHtml } from '../../utils/html.js';
import { chartBars } from '../../utils/chart.js';
import { fileToBase64 } from '../../utils/file.js';

export function createConditionPage(ctx) {
  const { render, api, loadCondition } = ctx;

  return {
    title: '컨디션 분석',
    render() {
      if (!window._hcCond) window._hcCond = { list: null, loading: true };
      const st = window._hcCond;
      if (st.loading && st.list === null) {
        loadCondition().then((list) => {
          st.list = list;
          st.loading = false;
          render();
        });
        return "<div class='card'><i class='fa fa-spinner fa-spin'></i> 불러오는 중...</div>";
      }
      window.runConditionAnalyze = function () {
        const fat = document.getElementById('fatigue-self');
        const v = fat ? fat.value : '';
        const fileEl = document.getElementById('face-file');
        const p =
          fileEl && fileEl.files && fileEl.files[0]
            ? fileToBase64(fileEl.files[0])
            : Promise.resolve(null);
        p.then((b64) =>
          api('/api/condition/analyze', {
            method: 'POST',
            body: JSON.stringify({ imageBase64: b64, fatigueSelf: v }),
          }),
        )
          .then(() => {
            st.loading = true;
            st.list = null;
            window._hcDash = { loading: true };
            render();
          })
          .catch((e) => {
            alert(e.message || '분석 실패');
          });
      };
      const hist = (st.list || []).slice(0, 14);
      const fatigueTrend = hist.map((x) => x.fatigue).reverse();
      const trendLbl = hist
        .map((x) => new Date(x.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }))
        .reverse();
      return (
        '<h2><i class="fa fa-face-smile-beam"></i> 컨디션 분석</h2>' +
        '<p class="muted small">데모: 이미지는 일관된 시드 기반 추정에만 사용됩니다. 실제 의료기기·검증된 모델 연동이 필요합니다.</p>' +
        '<div class="card">' +
        "<div class='section-label'>얼굴 촬영 / 이미지 선택</div>" +
        '<input type="file" id="face-file" accept="image/*" capture="user" />' +
        '<p class="muted small">웹캠·갤러리에서 선택 가능합니다.</p>' +
        '<label>주관적 피로 (1–10)</label> ' +
        '<input type="range" id="fatigue-self" min="1" max="10" value="5" style="width:200px;vertical-align:middle"/>' +
        '<button type="button" class="btn-primary" style="margin-left:12px" onclick="runConditionAnalyze()">분석하기</button>' +
        '</div>' +
        (fatigueTrend.length
          ? `<div class="card"><div class="section-label">피로 지수 추세 (최근 기록)</div>${chartBars(fatigueTrend, trendLbl, '#f0c040')}</div>`
          : '') +
        '<div class="card">' +
        "<div class='section-label'>기록</div>" +
        (hist.length
          ? `<ul class="hist-list">${hist
              .map(
                (x) =>
                  `<li><strong>${new Date(x.at).toLocaleString('ko-KR')}</strong> · 피로 ${x.fatigue} · 피부 ${escapeHtml(x.skin)} · ${escapeHtml(x.mood)}` +
                  `<div class="muted small">${escapeHtml(x.note || '')}</div></li>`,
              )
              .join('')}</ul>`
          : '<p class="muted">기록이 없습니다.</p>') +
        '</div>'
      );
    },
  };
}
