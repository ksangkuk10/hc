import { escapeHtml } from '../../utils/html.js';

export function createContactPage(ctx) {
  const { render, api, t } = ctx;

  return {
    title: 'Contact',
    render() {
      if (!window._hcContactPage) {
        window._hcContactPage = {
          loading: false,
          error: null,
          aiText: null,
          note: '',
          model: '',
        };
      }
      const st = window._hcContactPage;

      window.confirmCall119 = function () {
        if (confirm(t('contact.confirm119'))) {
          window.location.href = 'tel:119';
        }
      };

      window.loadEmergencyNearby = function () {
        if (st.loading) return;
        if (!navigator.geolocation) {
          alert(t('contact.noGeolocation'));
          return;
        }
        st.loading = true;
        st.error = null;
        st.aiText = null;
        st.note = '';
        st.model = '';
        render();
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            api('/api/contact/emergency-nearby-ai', {
              method: 'POST',
              body: JSON.stringify({ lat, lng }),
            })
              .then((j) => {
                st.aiText = typeof j.text === 'string' ? j.text : '';
                st.note = j.note || '';
                st.model = j.model || '';
                st.loading = false;
                render();
              })
              .catch((e) => {
                st.loading = false;
                st.error = e.message || t('contact.loadFail');
                render();
              });
          },
          () => {
            st.loading = false;
            st.error = t('contact.locDenied');
            render();
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
        );
      };

      const aiBlock =
        st.aiText != null && String(st.aiText).length > 0
          ? `<div class="contact-ai-er-box"><div class="answer" style="white-space:pre-wrap;word-break:break-word">${escapeHtml(st.aiText)}</div></div>`
          : st.aiText !== null && !st.loading && !st.error
            ? `<p class="muted">${escapeHtml(t('contact.aiEmpty'))}</p>`
            : '';

      return (
        `<h2><i class="fa fa-address-book"></i> ${escapeHtml(t('contact.title'))}</h2>` +
        `<p class="muted small">${escapeHtml(t('contact.emergencyIntro'))}</p>` +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('contact.emergency'))}</div>` +
        '<div class="contact-emergency-119">' +
        `<button type="button" class="contact-tel-big" onclick="confirmCall119()"><i class="fa fa-phone"></i> 119</button>` +
        `<p class="muted small" style="margin:8px 0 0">${escapeHtml(t('contact.emergency119'))}</p>` +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('contact.aiNearby'))}</div>` +
        `<p class="muted small" style="margin-top:0">${escapeHtml(t('contact.aiHint'))}</p>` +
        `<button type="button" class="btn-primary" style="margin-top:4px" onclick="loadEmergencyNearby()" ${st.loading ? 'disabled' : ''}>` +
        (st.loading
          ? `<i class="fa fa-spinner fa-spin"></i> ${escapeHtml(t('contact.aiLoading'))}`
          : `<i class="fa fa-location-dot"></i> ${escapeHtml(t('contact.findBtn'))}`) +
        '</button>' +
        (st.error ? `<p class="muted" style="margin-top:12px;color:#9a5c5c">${escapeHtml(st.error)}</p>` : '') +
        (st.model
          ? `<p class="muted small" style="margin-top:10px">${escapeHtml(t('contact.modelLabel'))} ${escapeHtml(st.model)}</p>`
          : '') +
        (st.note ? `<p class="muted small">${escapeHtml(st.note)}</p>` : '') +
        (aiBlock ? `<div style="margin-top:14px">${aiBlock}</div>` : '') +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('contact.other'))}</div>` +
        `<p class="muted small" style="margin-top:0"><a href="tel:1339">1339</a> — ${escapeHtml(t('contact.hotline1339'))}</p>` +
        '</div>'
      );
    },
  };
}
