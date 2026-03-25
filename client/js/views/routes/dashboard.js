import { getDate } from '../../utils/date.js';
import { escapeHtml } from '../../utils/html.js';
import { chartBars } from '../../utils/chart.js';

export function createDashboardPage(ctx) {
  const {
    render,
    loadHealth,
    loadGoals,
    loadReminders,
    loadCondition,
    loadFood,
    t,
    getDateLocale,
  } = ctx;

  return {
    title: 'Dashboard',
    render() {
      if (!window._hcDash) window._hcDash = { loading: true };
      const st = window._hcDash;
      const dl = getDateLocale();
      if (st.loading) {
        Promise.all([loadHealth(), loadGoals(), loadReminders(), loadCondition(), loadFood()])
          .then((arr) => {
            st.health = arr[0];
            st.goals = arr[1];
            st.reminders = arr[2];
            st.condition = arr[3];
            st.food = arr[4];
            st.loading = false;
            render();
          })
          .catch(() => {
            st.loading = false;
            render();
          });
        return `<div class='card'><i class='fa fa-spinner fa-spin'></i> ${escapeHtml(t('common.dashLoading'))}</div>`;
      }
      const today = getDate(0);
      const todayRow =
        (st.health || []).find((r) => r.date === today) || {};
      const last7 = [];
      for (let i = 6; i >= 0; i--) last7.push(getDate(-i));
      const walkSeries = last7.map((d) => {
        const row = (st.health || []).find((r) => r.date === d);
        return row && row.walk ? Number(row.walk) : 0;
      });
      const lbls = last7.map((d) => d.slice(5));
      const latestC = (st.condition && st.condition[0]) || null;
      const latestF = (st.food && st.food[0]) || null;
      const none = t('common.none');
      const goalsHtml = (st.goals || [])
        .map((g) => {
          const pct = Math.min(
            100,
            Math.round((Number(g.progress) / Math.max(1, Number(g.target))) * 100),
          );
          return (
            `<div class="goal-row"><div class="goal-title">${escapeHtml(g.title)}</div>` +
            `<div class="progress-outer"><div class="progress-inner" style="width:${pct}%"></div></div>` +
            `<div class="goal-meta">${escapeHtml(t('dashboard.goalMeta', { pct: String(pct), target: String(g.target), unit: g.unit || '' }))}</div></div>`
          );
        })
        .join('');
      const remHtml = (st.reminders || [])
        .filter((r) => r.enabled)
        .slice(0, 5)
        .map(
          (r) =>
            `<div class="rem-item"><span class="rem-time">${escapeHtml(r.time)}</span> ${escapeHtml(r.text)}</div>`,
        )
        .join('');
      return (
        `<h2><i class="fa fa-chart-pie"></i> ${escapeHtml(t('dashboard.title'))}</h2>` +
        '<div class="dash-grid">' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('dashboard.todaySummary', { date: today }))}</div>` +
        `<div class="dash-today-summary">` +
        `<p>${escapeHtml(t('dashboard.walk'))} <b>${escapeHtml(String(todayRow.walk != null && todayRow.walk !== '' ? todayRow.walk : none))}</b> ${escapeHtml(t('dashboard.min'))}</p>` +
        `<p>${escapeHtml(t('dashboard.run'))} <b>${escapeHtml(String(todayRow.run != null && todayRow.run !== '' ? todayRow.run : none))}</b> ${escapeHtml(t('dashboard.min'))}</p>` +
        `<p>${escapeHtml(t('dashboard.sleep'))} <b>${escapeHtml(String(todayRow.sleep != null && todayRow.sleep !== '' ? todayRow.sleep : none))}</b> ${escapeHtml(t('dashboard.h'))}</p>` +
        `<p>${escapeHtml(t('dashboard.weight'))} <b>${escapeHtml(String(todayRow.weight != null && todayRow.weight !== '' ? todayRow.weight : none))}</b> ${escapeHtml(t('dashboard.kg'))}</p>` +
        `<p>${escapeHtml(t('dashboard.bp'))} <b>${todayRow.bpSys && todayRow.bpDia ? escapeHtml(`${todayRow.bpSys}/${todayRow.bpDia}`) : none}</b></p>` +
        `</div>` +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('dashboard.recentCondition'))}</div>` +
        (latestC
          ? `<div class="dash-recent-cond">` +
            `<p>${escapeHtml(t('dashboard.subjectiveFatigue'))} <b>${latestC.fatigueSelf != null && latestC.fatigueSelf !== '' ? `${latestC.fatigueSelf}/10` : none}</b></p>` +
            `<p>${escapeHtml(t('dashboard.analysisFatigue'))} <b>${escapeHtml(String(latestC.fatigue))}</b> / 100</p>` +
            `<p>${escapeHtml(t('dashboard.skin'))} <b>${escapeHtml(latestC.skin)}</b></p>` +
            `<p>${escapeHtml(t('dashboard.mood'))} <b>${escapeHtml(latestC.mood)}</b></p>` +
            `<p class="muted small" style="margin-top:8px">${escapeHtml(new Date(latestC.at).toLocaleString(dl))}</p>` +
            `</div>`
          : `<p class="muted">${escapeHtml(t('dashboard.noCondition'))}</p>`) +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('dashboard.recentMeal'))}</div>` +
        (latestF
          ? `<p><b>${escapeHtml(latestF.label)}</b> · ~ ${latestF.nutrition.kcal}kcal</p><p class="muted small">${escapeHtml(latestF.advice)}</p>`
          : `<p class="muted">${escapeHtml(t('dashboard.noMeal'))}</p>`) +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('dashboard.walk7d'))}</div>` +
        chartBars(walkSeries, lbls, '#b8956c') +
        '</div>' +
        '<div class="dash-grid two">' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('dashboard.goals'))}</div>` +
        (goalsHtml || `<p class="muted">${escapeHtml(t('dashboard.noGoals'))}</p>`) +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('dashboard.reminders'))}</div>` +
        (remHtml || `<p class="muted">${escapeHtml(t('dashboard.noReminders'))}</p>`) +
        '</div>' +
        '</div>' +
        '<div class="quick-actions">' +
        `<button type="button" class="qa" onclick="location.hash='health'"><i class="fa fa-person-walking"></i> ${escapeHtml(t('dashboard.qaHealth'))}</button>` +
        `<button type="button" class="qa" onclick="location.hash='condition'"><i class="fa fa-camera"></i> ${escapeHtml(t('dashboard.qaCondition'))}</button>` +
        `<button type="button" class="qa" onclick="location.hash='food'"><i class="fa fa-utensils"></i> ${escapeHtml(t('dashboard.qaFood'))}</button>` +
        '</div>'
      );
    },
  };
}
