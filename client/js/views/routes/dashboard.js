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
  } = ctx;

  return {
    title: '대시보드',
    render() {
      if (!window._hcDash) window._hcDash = { loading: true };
      const st = window._hcDash;
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
        return "<div class='card'><i class='fa fa-spinner fa-spin'></i> 대시보드를 불러오는 중...</div>";
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
      const goalsHtml = (st.goals || [])
        .map((g) => {
          const pct = Math.min(
            100,
            Math.round((Number(g.progress) / Math.max(1, Number(g.target))) * 100),
          );
          return (
            `<div class="goal-row"><div class="goal-title">${escapeHtml(g.title)}</div>` +
            `<div class="progress-outer"><div class="progress-inner" style="width:${pct}%"></div></div>` +
            `<div class="goal-meta">${pct}% · 목표 ${escapeHtml(String(g.target))}${escapeHtml(g.unit || '')}</div></div>`
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
        '<h2><i class="fa fa-chart-pie"></i> 대시보드</h2>' +
        '<div class="dash-grid">' +
        '<div class="card">' +
        `<div class='section-label'>오늘의 요약 · ${today}</div>` +
        `<div class="dash-today-summary">` +
        `<p>걷기 <b>${escapeHtml(String(todayRow.walk != null && todayRow.walk !== '' ? todayRow.walk : '—'))}</b> 분</p>` +
        `<p>달리기 <b>${escapeHtml(String(todayRow.run != null && todayRow.run !== '' ? todayRow.run : '—'))}</b> 분</p>` +
        `<p>수면 <b>${escapeHtml(String(todayRow.sleep != null && todayRow.sleep !== '' ? todayRow.sleep : '—'))}</b> h</p>` +
        `<p>체중 <b>${escapeHtml(String(todayRow.weight != null && todayRow.weight !== '' ? todayRow.weight : '—'))}</b> kg</p>` +
        `<p>혈압 <b>${todayRow.bpSys && todayRow.bpDia ? escapeHtml(`${todayRow.bpSys}/${todayRow.bpDia}`) : '—'}</b></p>` +
        `</div>` +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>최근 컨디션</div>" +
        (latestC
          ? `<div class="dash-recent-cond">` +
            `<p>주관적 피로 <b>${latestC.fatigueSelf != null && latestC.fatigueSelf !== '' ? `${latestC.fatigueSelf}/10` : '—'}</b></p>` +
            `<p>분석 피로 <b>${escapeHtml(String(latestC.fatigue))}</b> / 100</p>` +
            `<p>피부 <b>${escapeHtml(latestC.skin)}</b></p>` +
            `<p>기분 <b>${escapeHtml(latestC.mood)}</b></p>` +
            `<p class="muted small" style="margin-top:8px">${escapeHtml(new Date(latestC.at).toLocaleString('ko-KR'))}</p>` +
            `</div>`
          : '<p class="muted">아직 분석 기록이 없습니다. 컨디션 분석에서 촬영해 보세요.</p>') +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>최근 식단</div>" +
        (latestF
          ? `<p><b>${escapeHtml(latestF.label)}</b> · 약 ${latestF.nutrition.kcal}kcal</p><p class="muted small">${escapeHtml(latestF.advice)}</p>`
          : '<p class="muted">식단 분석에서 기록해 보세요.</p>') +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>지난 7일 걷기(분)</div>" +
        chartBars(walkSeries, lbls, '#b8956c') +
        '</div>' +
        '<div class="dash-grid two">' +
        '<div class="card">' +
        "<div class='section-label'>목표 진척도</div>" +
        (goalsHtml || '<p class="muted">목표가 없습니다.</p>') +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>리마인더</div>" +
        (remHtml || '<p class="muted">알림이 없습니다. 설정에서 추가하세요.</p>') +
        '</div>' +
        '</div>' +
        '<div class="quick-actions">' +
        `<button type="button" class="qa" onclick="location.hash='health'"><i class="fa fa-person-walking"></i> 운동·수면 기록</button>` +
        `<button type="button" class="qa" onclick="location.hash='condition'"><i class="fa fa-camera"></i> 컨디션 촬영</button>` +
        `<button type="button" class="qa" onclick="location.hash='food'"><i class="fa fa-utensils"></i> 식단 분석</button>` +
        '</div>'
      );
    },
  };
}
