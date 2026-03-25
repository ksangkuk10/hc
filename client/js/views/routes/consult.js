import { escapeHtml } from '../../utils/html.js';

export function createConsultPage(ctx) {
  const { render, api, loadConsult } = ctx;

  return {
    title: '전문가 상담',
    render() {
      if (!window._hcConsult) window._hcConsult = { list: null, loading: true };
      const st = window._hcConsult;
      if (st.loading && st.list === null) {
        loadConsult().then((list) => {
          st.list = list;
          st.loading = false;
          render();
        });
        return "<div class='card'><i class='fa fa-spinner fa-spin'></i> 불러오는 중...</div>";
      }
      window.submitConsult = function () {
        const type = document.getElementById('consult-type').value;
        const message = document.getElementById('consult-msg').value;
        api('/api/consult', { method: 'POST', body: JSON.stringify({ type, message }) })
          .then(() => {
            st.loading = true;
            st.list = null;
            document.getElementById('consult-msg').value = '';
            render();
          })
          .catch((e) => {
            alert(e.message || '접수 실패');
          });
      };
      const list = st.list || [];
      return (
        '<h2><i class="fa fa-user-doctor"></i> 전문가 상담</h2>' +
        '<p class="muted small">응급 상황은 119 또는 가까운 응급실로 연락하세요. 본 서비스는 데모 접수입니다.</p>' +
        '<div class="card">' +
        "<div class='section-label'>상담 신청</div>" +
        '<select id="consult-type">' +
        '<option value="text">텍스트 상담</option>' +
        '<option value="voice">음성 상담 (예약)</option>' +
        '<option value="video">화상 상담 (예약)</option>' +
        '</select>' +
        '<textarea id="consult-msg" rows="5" placeholder="증상·질문을 구체적으로 적어 주세요."></textarea>' +
        '<button type="button" class="btn-primary" onclick="submitConsult()">접수</button>' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>상담 이력</div>" +
        (list.length
          ? `<ul class="hist-list">${list
              .map(
                (x) =>
                  `<li><strong>${new Date(x.createdAt).toLocaleString('ko-KR')}</strong> [${escapeHtml(x.type)}] ${escapeHtml(x.status)}` +
                  `<div>${escapeHtml(x.message)}</div>` +
                  (x.answer ? `<div class="answer">답변: ${escapeHtml(x.answer)}</div>` : '') +
                  '</li>',
              )
              .join('')}</ul>`
          : '<p class="muted">접수 내역이 없습니다.</p>') +
        '</div>'
      );
    },
  };
}
