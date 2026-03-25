import { escapeHtml } from '../../utils/html.js';

export function createContactPage(ctx) {
  const { render, api } = ctx;

  return {
    title: '연락처',
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
        if (
          confirm(
            '119 응급 신고로 전화를 거시겠습니까?\n\n실제 응급 상황일 때만 이용해 주세요.',
          )
        ) {
          window.location.href = 'tel:119';
        }
      };

      window.loadEmergencyNearby = function () {
        if (st.loading) return;
        if (!navigator.geolocation) {
          alert('이 브라우저에서는 위치 정보를 사용할 수 없습니다.');
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
                st.error = e.message || '조회 실패';
                render();
              });
          },
          () => {
            st.loading = false;
            st.error = '위치 권한이 거부되었거나 위치를 확인할 수 없습니다.';
            render();
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
        );
      };

      const aiBlock =
        st.aiText != null && String(st.aiText).length > 0
          ? `<div class="contact-ai-er-box"><div class="answer" style="white-space:pre-wrap;word-break:break-word">${escapeHtml(st.aiText)}</div></div>`
          : st.aiText !== null && !st.loading && !st.error
            ? '<p class="muted">AI가 안내 문구를 반환하지 않았습니다. 119·1339로 문의하세요.</p>'
            : '';

      return (
        '<h2><i class="fa fa-address-book"></i> 연락처</h2>' +
        '<p class="muted small">응급 시 화면에 표시된 번호가 없거나 불확실하면 <strong>119</strong> 또는 <strong>1339</strong>(응급의료정보)로 연락하세요.</p>' +
        '<div class="card">' +
        "<div class='section-label'>응급 신고</div>" +
        '<div class="contact-emergency-119">' +
        '<button type="button" class="contact-tel-big" onclick="confirmCall119()"><i class="fa fa-phone"></i> 119</button>' +
        '<p class="muted small" style="margin:8px 0 0">화재·구급·응급 구조·해양 사고 등 국가 통합 신고</p>' +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>내 위치 기준 가까운 병원 (AI 안내)</div>" +
        '<p class="muted small" style="margin-top:0">위치를 허용하면 <strong>GitHub Models</strong>의 <code>openai/gpt-4.1</code>(환경변수 <code>GITHUB_TOKEN</code> 등)으로 근처 병원·응급 안내를 요청합니다. <strong>참고용</strong>이며 실시간·정확한 응급실 정보가 아닙니다.</p>' +
        `<button type="button" class="btn-primary" style="margin-top:4px" onclick="loadEmergencyNearby()" ${st.loading ? 'disabled' : ''}>` +
        (st.loading ? '<i class="fa fa-spinner fa-spin"></i> AI 분석 중…' : '<i class="fa fa-location-dot"></i> 현재 위치로 가까운 병원 찾기') +
        '</button>' +
        (st.error ? `<p class="muted" style="margin-top:12px;color:#9a5c5c">${escapeHtml(st.error)}</p>` : '') +
        (st.model ? `<p class="muted small" style="margin-top:10px">모델: ${escapeHtml(st.model)}</p>` : '') +
        (st.note ? `<p class="muted small">${escapeHtml(st.note)}</p>` : '') +
        (aiBlock ? `<div style="margin-top:14px">${aiBlock}</div>` : '') +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>기타 응급·안내</div>" +
        '<p class="muted small" style="margin-top:0"><a href="tel:1339">1339</a> — 응급의료정보센터 (24시간)</p>' +
        '</div>'
      );
    },
  };
}
