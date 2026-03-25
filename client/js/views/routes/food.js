import { escapeHtml } from '../../utils/html.js';
import { fileToBase64 } from '../../utils/file.js';

export function createFoodPage(ctx) {
  const { render, api, loadFood } = ctx;

  return {
    title: '음식 & 식단 분석',
    render() {
      if (!window._hcFood) window._hcFood = { list: null, loading: true };
      const st = window._hcFood;
      if (st.loading && st.list === null) {
        loadFood().then((list) => {
          st.list = list;
          st.loading = false;
          render();
        });
        return "<div class='card'><i class='fa fa-spinner fa-spin'></i> 불러오는 중...</div>";
      }
      window.runFoodAnalyze = function () {
        const label = document.getElementById('food-label').value;
        const fileEl = document.getElementById('food-file');
        const p =
          fileEl && fileEl.files && fileEl.files[0]
            ? fileToBase64(fileEl.files[0])
            : Promise.resolve(null);
        p.then((b64) =>
          api('/api/food/analyze', {
            method: 'POST',
            body: JSON.stringify({ label, imageBase64: b64 }),
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
      const hist = st.list || [];
      return (
        '<h2><i class="fa fa-bowl-food"></i> 음식 & 식단 분석</h2>' +
        '<p class="muted small">데모: 음식명·이미지 해시 기반 가상 영양 추정입니다. 실제 서비스에서는 영양 DB와 비전 모델이 필요합니다.</p>' +
        '<div class="card">' +
        "<div class='section-label'>음식 입력 / 사진</div>" +
        '<input id="food-label" class="wide" placeholder="예: 김치찌개, 샐러드" />' +
        '<input type="file" id="food-file" accept="image/*" />' +
        '<button type="button" class="btn-primary" onclick="runFoodAnalyze()">분석 및 기록</button>' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>식단 이력</div>" +
        (hist.length
          ? `<ul class="hist-list">${hist
              .map(
                (x) =>
                  `<li><strong>${escapeHtml(x.label)}</strong> · ${x.nutrition.kcal}kcal · 단백질 ${x.nutrition.proteinG}g · 나트륨 약 ${x.nutrition.sodiumMg}mg<br/><span class="muted">${escapeHtml(x.advice)}</span></li>`,
              )
              .join('')}</ul>`
          : '<p class="muted">기록이 없습니다.</p>') +
        '</div>'
      );
    },
  };
}
