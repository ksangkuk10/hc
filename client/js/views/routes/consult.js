import { escapeHtml } from '../../utils/html.js';

function consultTypeLabel(type, t) {
  if (type === 'ai') return t('consult.aiTitle');
  if (type === 'text') return t('consult.optText');
  if (type === 'voice') return t('consult.optVoice');
  if (type === 'video') return t('consult.optVideo');
  return String(type || '');
}

export function createConsultPage(ctx) {
  const { render, api, loadConsult, t, getDateLocale } = ctx;
  const dl = getDateLocale();

  return {
    title: 'Consult',
    render() {
      if (!window._hcConsult) window._hcConsult = { list: null, loading: true, aiBusy: false };
      const st = window._hcConsult;
      if (st.loading && st.list === null) {
        loadConsult().then((list) => {
          st.list = list;
          st.loading = false;
          render();
        });
        return `<div class='card'><i class='fa fa-spinner fa-spin'></i> ${escapeHtml(t('common.loading'))}</div>`;
      }

      window.submitAiConsult = function () {
        if (st.aiBusy) return;
        const raw = document.getElementById('ai-symptoms').value;
        const symptoms = raw != null ? String(raw) : '';
        const trimmed = symptoms.trim();
        if (!trimmed) {
          alert(t('consult.emptySymptom'));
          return;
        }
        if (trimmed.length < 5) {
          alert(t('consult.shortSymptom'));
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
            alert(e.message || t('consult.failAi'));
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
            alert(e.message || t('consult.failExpert'));
          });
      };

      const list = st.list || [];

      return (
        `<h2><i class="fa fa-comments"></i> ${escapeHtml(t('consult.title'))}</h2>` +
        `<p class="muted small">${escapeHtml(t('consult.disclaimer'))}</p>` +
        '<div class="consult-page">' +
        '<div class="consult-forms-row">' +
        '<div class="card consult-ai">' +
        `<div class='section-label'>${escapeHtml(t('consult.aiTitle'))}</div>` +
        `<p class="muted small" style="margin-top:0">${escapeHtml(t('consult.aiHint'))}</p>` +
        `<label for="ai-symptoms">${escapeHtml(t('consult.symptom'))}</label>` +
        `<textarea id="ai-symptoms" class="wide" rows="6" placeholder="${escapeHtml(t('consult.symptomPlaceholder'))}"></textarea>` +
        `<button type="button" class="btn-primary" style="margin-top:8px" onclick="submitAiConsult()" ${st.aiBusy ? 'disabled' : ''}>` +
        (st.aiBusy
          ? `<i class="fa fa-spinner fa-spin"></i> ${escapeHtml(t('consult.aiBusy'))}`
          : `<i class="fa fa-robot"></i> ${escapeHtml(t('consult.aiAsk'))}`) +
        '</button>' +
        '</div>' +
        '<div class="card consult-expert">' +
        `<div class='section-label'>${escapeHtml(t('consult.expertTitle'))}</div>` +
        `<p class="muted small" style="margin-top:0">${escapeHtml(t('consult.expertHint'))}</p>` +
        `<label for="consult-type">${escapeHtml(t('consult.type'))}</label>` +
        '<select id="consult-type">' +
        `<option value="text">${escapeHtml(t('consult.optText'))}</option>` +
        `<option value="voice">${escapeHtml(t('consult.optVoice'))}</option>` +
        `<option value="video">${escapeHtml(t('consult.optVideo'))}</option>` +
        '</select>' +
        '<div class="consult-expert-query">' +
        `<label for="consult-msg">${escapeHtml(t('consult.symptomQ'))}</label>` +
        `<textarea id="consult-msg" class="wide" rows="5" placeholder="${escapeHtml(t('consult.msgPlaceholder'))}"></textarea>` +
        `<button type="button" class="btn-primary btn-consult-expert-submit" onclick="submitConsult()">${escapeHtml(t('consult.submit'))}</button>` +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="card consult-log-block">' +
        `<div class='section-label'>${escapeHtml(t('consult.log'))}</div>` +
        (list.length
          ? `<ul class="hist-list">${list
              .map((x) => {
                const when = new Date(x.createdAt).toLocaleString(dl);
                const isAi = x.type === 'ai';
                const tagClass = isAi ? 'ai' : 'expert';
                const tagText = isAi ? t('consult.tagAi') : t('consult.tagExpert');
                return (
                  `<li>` +
                  `<div class="muted small" style="margin-bottom:6px">` +
                  `<span class="consult-type-tag ${tagClass}">${escapeHtml(tagText)}</span>` +
                  `<strong>${escapeHtml(when)}</strong> · ${escapeHtml(consultTypeLabel(x.type, t))}` +
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
          : `<p class="muted">${escapeHtml(t('consult.emptyLog'))}</p>`) +
        '</div>' +
        '</div>'
      );
    },
  };
}
