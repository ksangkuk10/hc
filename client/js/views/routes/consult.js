import { escapeHtml } from '../../utils/html.js';

function consultTypeLabel(type) {
  if (type === 'ai') return 'AI 상담';
  if (type === 'text') return '텍스트 상담';
  if (type === 'voice') return '음성 상담';
  if (type === 'video') return '화상 상담';
  return String(type || '');
}

export function createConsultPage(ctx) {
  const { render, api, loadConsult } = ctx;

  return {
    title: '상담',
    render() {
      if (!window._hcConsult) window._hcConsult = { list: null, loading: true, aiBusy: false };
      const st = window._hcConsult;
      if (st.loading && st.list === null) {
        loadConsult().then((list) => {
          st.list = list;
          st.loading = false;
          render();
        });
        return "<div class='card'><i class='fa fa-spinner fa-spin'></i> 불러오는 중...</div>";
      }

      window.submitAiConsult = function () {
        if (st.aiBusy) return;
        const raw = document.getElementById('ai-symptoms').value;
        const symptoms = raw != null ? String(raw) : '';
        const trimmed = symptoms.trim();
        if (!trimmed) {
          alert('증상을 입력해 주세요.');
          return;
        }
        if (trimmed.length < 5) {
          alert('증상을 5자 이상 입력해 주세요.');
          return;
        }
        st.aiBusy = true;
        render();
        api('/api/consult/ai', { method: 'POST', body: JSON.stringify({ symptoms: trimmed }) })
          .then((j) => {
            const item = j.item;
            if (item && st.list) {
              st.list = [item, ...st.list.filter((x) => x.id !== item.id)];
            } else {
              st.loading = true;
              st.list = null;
            }
            st.aiBusy = false;
            render();
          })
          .catch((e) => {
            st.aiBusy = false;
            alert(e.message || 'AI 상담 요청 실패');
            render();
          });
      };

      window.submitConsult = function () {
        const type = document.getElementById('consult-type').value;
        const message = document.getElementById('consult-msg').value;
        api('/api/consult', { method: 'POST', body: JSON.stringify({ type, message }) })
          .then(() => {
            st.loading = true;
            st.list = null;
            const msgEl = document.getElementById('consult-msg');
            if (msgEl) msgEl.value = '';
            render();
          })
          .catch((e) => {
            alert(e.message || '접수 실패');
          });
      };

      const list = st.list || [];

      return (
        '<h2><i class="fa fa-comments"></i> 상담</h2>' +
        '<p class="muted small">응급 상황은 119 또는 가까운 응급실로 연락하세요. AI 답변은 참고용이며 진단·처방을 대체하지 않습니다.</p>' +
        '<div class="consult-page">' +
        '<div class="consult-forms-row">' +
        '<div class="card consult-ai">' +
        "<div class='section-label'>AI 상담</div>" +
        '<p class="muted small" style="margin-top:0">현재 증상을 입력하면 GPT-4.1 기반 모델이 감별에 참고할 수 있는 질환 방향과 일반적인 치료·관찰 포인트를 안내합니다.</p>' +
        '<label for="ai-symptoms">증상</label>' +
        '<textarea id="ai-symptoms" class="wide" rows="6" placeholder="예: 이틀째 미열과 인후통, 기침이 있고 앞으로 숙이면 머리가 아파요."></textarea>' +
        `<button type="button" class="btn-primary" style="margin-top:8px" onclick="submitAiConsult()" ${st.aiBusy ? 'disabled' : ''}>` +
        (st.aiBusy ? '<i class="fa fa-spinner fa-spin"></i> 분석 중…' : '<i class="fa fa-robot"></i> AI에게 물어보기') +
        '</button>' +
        '</div>' +
        '<div class="card consult-expert">' +
        "<div class='section-label'>전문가 상담</div>" +
        '<p class="muted small" style="margin-top:0">전문가 연결·예약 접수(데모)입니다.</p>' +
        '<label for="consult-type">상담 유형</label>' +
        '<select id="consult-type">' +
        '<option value="text">텍스트 상담</option>' +
        '<option value="voice">음성 상담 (예약)</option>' +
        '<option value="video">화상 상담 (예약)</option>' +
        '</select>' +
        '<div class="consult-expert-query">' +
        '<label for="consult-msg">증상·질문</label>' +
        '<textarea id="consult-msg" class="wide" rows="5" placeholder="증상·질문을 구체적으로 적어 주세요."></textarea>' +
        '<button type="button" class="btn-primary btn-consult-expert-submit" onclick="submitConsult()">접수</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="card consult-log-block">' +
        "<div class='section-label'>상담 로그</div>" +
        (list.length
          ? `<ul class="hist-list">${list
              .map((x) => {
                const when = new Date(x.createdAt).toLocaleString('ko-KR');
                const isAi = x.type === 'ai';
                const tagClass = isAi ? 'ai' : 'expert';
                const tagText = isAi ? 'AI' : '전문가';
                return (
                  `<li>` +
                  `<div class="muted small" style="margin-bottom:6px">` +
                  `<span class="consult-type-tag ${tagClass}">${tagText}</span>` +
                  `<strong>${escapeHtml(when)}</strong> · ${escapeHtml(consultTypeLabel(x.type))}` +
                  (x.status ? ` · <span class="muted">${escapeHtml(x.status)}</span>` : '') +
                  `</div>` +
                  `<div style="margin-top:4px">${escapeHtml(x.message)}</div>` +
                  (x.answer
                    ? `<div class="answer" style="white-space:pre-wrap;word-break:break-word">${escapeHtml(x.answer)}</div>`
                    : '') +
                  `</li>`
                );
              })
              .join('')}</ul>`
          : '<p class="muted">상담 기록이 없습니다.</p>') +
        '</div>' +
        '</div>'
      );
    },
  };
}
