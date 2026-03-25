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
    t,
  } = ctx;

  return {
    title: 'Settings',
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
        return `<div class='card'><i class='fa fa-spinner fa-spin'></i> ${escapeHtml(t('common.loading'))}</div>`;
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
            alert(t('settings.profileSaved'));
            document.getElementById('prof-pw').value = '';
            document.getElementById('prof-cur').value = '';
            ctx.updateHeaderProfile();
            render();
          })
          .catch((e) => {
            alert(e.message || t('common.saveFail'));
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
          alert(t('settings.appSettingsSaved'));
        });
      };
      window.saveGoalsRem = function () {
        const goals = (st.goals || []).map((g, i) => {
          const p = document.getElementById(`goal-p-${i}`);
          const prog = p ? Number(p.value) || 0 : g.progress;
          return { ...g, progress: prog };
        });
        const reminders = (st.reminders || []).map((r, i) => {
          const tm = document.getElementById(`rem-t-${i}`);
          const x = document.getElementById(`rem-x-${i}`);
          const e = document.getElementById(`rem-e-${i}`);
          return {
            id: r.id,
            time: tm ? tm.value : r.time,
            text: x ? x.value : r.text,
            enabled: e ? e.checked : r.enabled,
          };
        });
        Promise.all([saveGoals(goals), saveReminders(reminders)])
          .then(() => {
            st.goals = goals;
            st.reminders = reminders;
            window._hcDash = { loading: true };
            alert(t('settings.goalsRemSaved'));
            render();
          })
          .catch((e) => {
            alert(e.message || t('common.saveFail'));
          });
      };
      const me = st.me || {};
      const goalsRows = (st.goals || [])
        .map((g, i) => {
          return (
            `<div class="goal-edit"><strong>${escapeHtml(g.title)}</strong> · ${escapeHtml(t('settings.targetWord'))} ${escapeHtml(String(g.target))}${escapeHtml(g.unit || '')}` +
            `<label>${escapeHtml(t('settings.progressLabel'))}</label><input type="number" id="goal-p-${i}" min="0" step="0.1" value="${escapeHtml(String(g.progress != null ? g.progress : 0))}"/></div>`
          );
        })
        .join('');
      const remRows = (st.reminders || [])
        .map((r, i) => {
          return (
            `<div class="goal-edit" style="margin-bottom:16px">` +
            `<label>${escapeHtml(t('settings.time'))}</label><input type="time" id="rem-t-${i}" value="${escapeHtml(r.time || '09:00')}"/>` +
            `<label>${escapeHtml(t('settings.content'))}</label><input class="wide" id="rem-x-${i}" value="${escapeHtml(r.text || '')}"/>` +
            `<label><input type="checkbox" id="rem-e-${i}" ${r.enabled ? 'checked' : ''}/> ${escapeHtml(t('settings.enabled'))}</label></div>`
          );
        })
        .join('');
      return (
        `<h2><i class="fa fa-gear"></i> ${escapeHtml(t('settings.title'))}</h2>` +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('settings.profile'))}</div>` +
        `<p class="muted small">${escapeHtml(me.email || '')}</p>` +
        `<label>${escapeHtml(t('settings.labelName'))}</label><input id="prof-name" class="wide" value="${escapeHtml(me.name || '')}"/>` +
        `<label>${escapeHtml(t('settings.newPw'))}</label><input id="prof-pw" type="password" class="wide" placeholder="${escapeHtml(t('settings.newPwPlaceholder'))}"/>` +
        `<label>${escapeHtml(t('settings.curPwForChange'))}</label><input id="prof-cur" type="password" class="wide"/>` +
        `<button type="button" class="btn-primary" onclick="saveProfile()">${escapeHtml(t('settings.saveProfileBtn'))}</button>` +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('settings.notifyDemo'))}</div>` +
        `<label><input type="checkbox" id="set-goals" ${s.notifyGoals !== false ? 'checked' : ''}/> ${escapeHtml(t('settings.goalNotify'))}</label><br/>` +
        `<label><input type="checkbox" id="set-rem" ${s.notifyReminders !== false ? 'checked' : ''}/> ${escapeHtml(t('settings.remNotify'))}</label><br/>` +
        `<label><input type="checkbox" id="set-apple" ${s.wearableApple ? 'checked' : ''}/> ${escapeHtml(t('settings.apple'))}</label><br/>` +
        `<label><input type="checkbox" id="set-google" ${s.wearableGoogle ? 'checked' : ''}/> ${escapeHtml(t('settings.google'))}</label><br/>` +
        `<button type="button" class="btn-secondary" onclick="saveHcSettings()">${escapeHtml(t('settings.saveSettings'))}</button>` +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('settings.goalProgress'))}</div>` +
        (goalsRows || `<p class="muted">${escapeHtml(t('settings.noGoals'))}</p>`) +
        `<div class='section-label' style='margin-top:18px'>${escapeHtml(t('settings.remSection'))}</div>` +
        (remRows || `<p class="muted">${escapeHtml(t('settings.noRem'))}</p>`) +
        `<button type="button" class="btn-primary" onclick="saveGoalsRem()">${escapeHtml(t('settings.saveGoals'))}</button>` +
        '</div>' +
        `<div class="card muted small">${escapeHtml(t('settings.legal'))}</div>`
      );
    },
  };
}
