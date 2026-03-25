import { escapeHtml } from '../../utils/html.js';

export function createSettingsPage(ctx) {
  const {
    render,
    api,
    loadSettings,
    loadGoals,
    loadReminders,
    saveGoals,
    saveReminders,
  } = ctx;

  return {
    title: '설정',
    render() {
      if (!window._hcSet) window._hcSet = { settings: null, loading: true };
      const st = window._hcSet;
      if (st.loading && !st.settings) {
        Promise.all([loadSettings(), api('/api/auth/me'), loadGoals(), loadReminders()])
          .then((arr) => {
            st.settings = arr[0];
            st.me = arr[1];
            st.goals = arr[2];
            st.reminders = arr[3];
            st.loading = false;
            render();
          })
          .catch(() => {
            st.loading = false;
            render();
          });
        return "<div class='card'><i class='fa fa-spinner fa-spin'></i> 불러오는 중...</div>";
      }
      const s = st.settings || {};
      window.saveProfile = function () {
        const name = document.getElementById('prof-name').value;
        const pw = document.getElementById('prof-pw').value;
        const cur = document.getElementById('prof-cur').value;
        const body = { name };
        if (pw) {
          body.password = pw;
          body.currentPassword = cur;
        }
        api('/api/profile', { method: 'PUT', body: JSON.stringify(body) })
          .then(() => {
            alert('저장되었습니다.');
            document.getElementById('prof-pw').value = '';
            document.getElementById('prof-cur').value = '';
            ctx.updateHeaderProfile();
            render();
          })
          .catch((e) => {
            alert(e.message || '저장 실패');
          });
      };
      window.saveHcSettings = function () {
        const settings = {
          notifyGoals: document.getElementById('set-goals').checked,
          notifyReminders: document.getElementById('set-rem').checked,
          wearableApple: document.getElementById('set-apple').checked,
          wearableGoogle: document.getElementById('set-google').checked,
        };
        api('/api/settings', { method: 'PUT', body: JSON.stringify({ settings }) }).then(() => {
          st.settings = settings;
          alert('설정이 저장되었습니다.');
        });
      };
      window.saveGoalsRem = function () {
        const goals = (st.goals || []).map((g, i) => {
          const p = document.getElementById(`goal-p-${i}`);
          const prog = p ? Number(p.value) || 0 : g.progress;
          return { ...g, progress: prog };
        });
        const reminders = (st.reminders || []).map((r, i) => {
          const t = document.getElementById(`rem-t-${i}`);
          const x = document.getElementById(`rem-x-${i}`);
          const e = document.getElementById(`rem-e-${i}`);
          return {
            id: r.id,
            time: t ? t.value : r.time,
            text: x ? x.value : r.text,
            enabled: e ? e.checked : r.enabled,
          };
        });
        Promise.all([saveGoals(goals), saveReminders(reminders)])
          .then(() => {
            st.goals = goals;
            st.reminders = reminders;
            window._hcDash = { loading: true };
            alert('목표·리마인더가 저장되었습니다.');
            render();
          })
          .catch((e) => {
            alert(e.message || '저장 실패');
          });
      };
      const me = st.me || {};
      const goalsRows = (st.goals || [])
        .map((g, i) => {
          return (
            `<div class="goal-edit"><strong>${escapeHtml(g.title)}</strong> · 목표 ${escapeHtml(String(g.target))}${escapeHtml(g.unit || '')}` +
            `<label>진행값</label><input type="number" id="goal-p-${i}" min="0" step="0.1" value="${escapeHtml(String(g.progress != null ? g.progress : 0))}"/></div>`
          );
        })
        .join('');
      const remRows = (st.reminders || [])
        .map((r, i) => {
          return (
            `<div class="goal-edit" style="margin-bottom:16px">` +
            `<label>시간</label><input type="time" id="rem-t-${i}" value="${escapeHtml(r.time || '09:00')}"/>` +
            `<label>내용</label><input class="wide" id="rem-x-${i}" value="${escapeHtml(r.text || '')}"/>` +
            `<label><input type="checkbox" id="rem-e-${i}" ${r.enabled ? 'checked' : ''}/> 사용</label></div>`
          );
        })
        .join('');
      return (
        '<h2><i class="fa fa-gear"></i> 설정</h2>' +
        '<div class="card">' +
        "<div class='section-label'>프로필</div>" +
        `<p class="muted small">${escapeHtml(me.email || '')}</p>` +
        `<label>이름</label><input id="prof-name" class="wide" value="${escapeHtml(me.name || '')}"/>` +
        '<label>새 비밀번호 (변경 시)</label><input id="prof-pw" type="password" class="wide" placeholder="변경하지 않으면 비워두세요"/>' +
        '<label>현재 비밀번호 (비밀번호 변경 시 필수)</label><input id="prof-cur" type="password" class="wide"/>' +
        '<button type="button" class="btn-primary" onclick="saveProfile()">프로필 저장</button>' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>알림 · 연동 (데모)</div>" +
        `<label><input type="checkbox" id="set-goals" ${s.notifyGoals !== false ? 'checked' : ''}/> 목표·피드백 알림</label><br/>` +
        `<label><input type="checkbox" id="set-rem" ${s.notifyReminders !== false ? 'checked' : ''}/> 리마인더</label><br/>` +
        `<label><input type="checkbox" id="set-apple" ${s.wearableApple ? 'checked' : ''}/> Apple Health 연동 (준비 중)</label><br/>` +
        `<label><input type="checkbox" id="set-google" ${s.wearableGoogle ? 'checked' : ''}/> Google Fit 연동 (준비 중)</label><br/>` +
        '<button type="button" class="btn-secondary" onclick="saveHcSettings()">설정 저장</button>' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>목표 진행률</div>" +
        (goalsRows || '<p class="muted">목표 없음</p>') +
        "<div class='section-label' style='margin-top:18px'>리마인더</div>" +
        (remRows || '<p class="muted">리마인더 없음</p>') +
        '<button type="button" class="btn-primary" onclick="saveGoalsRem()">목표·리마인더 저장</button>' +
        '</div>' +
        '<div class="card muted small">' +
        '개인정보·의료 데이터는 민감정보입니다. 운영 환경에서는 SSL/TLS, 접근 통제, 암호화, HIPAA/GDPR·국내 의료법 준수가 필요합니다.' +
        '</div>'
      );
    },
  };
}
