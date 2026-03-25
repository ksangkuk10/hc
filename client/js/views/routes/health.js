import { getDate } from '../../utils/date.js';
import { escapeHtml } from '../../utils/html.js';
import { chartBars } from '../../utils/chart.js';

export function createHealthPage(ctx) {
  const { render, loadHealth, saveHealth, t } = ctx;

  return {
    title: 'Health',
    render() {
      if (!window._hcState) window._hcState = {};
      const state = window._hcState;
      if (state._healthLoading) {
        return `<div class='card'><i class='fa fa-spinner fa-spin'></i> ${escapeHtml(t('health.dataLoading'))}</div>`;
      }
      if (!state.data || state.forceHealthReload) {
        state.forceHealthReload = false;
        state._healthLoading = true;
        loadHealth()
          .then((data) => {
            state.data = data;
            state._healthLoading = false;
            render();
          })
          .catch((e) => {
            state._healthLoading = false;
            state.data = state.data || [];
            alert(e.message || t('health.loadFail'));
            render();
          });
        return `<div class='card'><i class='fa fa-spinner fa-spin'></i> ${escapeHtml(t('health.dataLoading'))}</div>`;
      }
      const today = getDate(0);
      const yest = getDate(-1);
      const lastWk = getDate(-7);
      let todayData = state.data.find((r) => r.date === today);
      if (!todayData) {
        todayData = { date: today, walk: '', run: '', sleep: '', weight: '', bpSys: '', bpDia: '' };
      }
      const yestData = state.data.find((r) => r.date === yest);
      const lastWkData = state.data.find((r) => r.date === lastWk);
      window.onHealthInput = function (k, v) {
        todayData[k] = v;
      };
      window.saveHealth = function () {
        const walkEl = document.getElementById('hc-walk');
        const runEl = document.getElementById('hc-run');
        const sleepEl = document.getElementById('hc-sleep');
        const weightEl = document.getElementById('hc-weight');
        const bpSysEl = document.getElementById('hc-bp-sys');
        const bpDiaEl = document.getElementById('hc-bp-dia');
        const row = {
          date: today,
          walk: walkEl ? walkEl.value : todayData.walk,
          run: runEl ? runEl.value : todayData.run,
          sleep: sleepEl ? sleepEl.value : todayData.sleep,
          weight: weightEl ? weightEl.value : todayData.weight,
          bpSys: bpSysEl ? bpSysEl.value : todayData.bpSys,
          bpDia: bpDiaEl ? bpDiaEl.value : todayData.bpDia,
        };
        const others = state.data.filter((r) => r.date !== today);
        const merged = others.concat([row]);
        saveHealth(merged)
          .then(() => {
            state.data = merged;
            Object.assign(todayData, row);
            window._hcDash = { loading: true };
            alert(t('common.saved'));
            render();
          })
          .catch((e) => {
            alert(e.message || t('health.saveFail'));
          });
      };
      const trendDays = [];
      for (let i = 13; i >= 0; i--) trendDays.push(getDate(-i));
      const weightSeries = trendDays.map((d) => {
        const row = state.data.find((r) => r.date === d);
        return row && row.weight ? Number(row.weight) : 0;
      });
      const wLabels = trendDays.map((d) => d.slice(8));
      const hasW = weightSeries.some((v) => v > 0);
      return (
        `<h2><i class="fa fa-heart-pulse"></i> ${escapeHtml(t('health.title'))}</h2>` +
        `<p class="muted small">${escapeHtml(t('health.disclaimer'))}</p>` +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('health.todayInput', { date: today }))}</div>` +
        '<table class="form-table">' +
        `<tr><td><i class="fa fa-person-walking"></i> ${escapeHtml(t('health.walk'))}</td><td><input id="hc-walk" type="number" min="0" value="${escapeHtml(todayData.walk)}" oninput="onHealthInput('walk', this.value)"/> ${escapeHtml(t('dashboard.min'))}</td></tr>` +
        `<tr><td><i class="fa fa-person-running"></i> ${escapeHtml(t('health.run'))}</td><td><input id="hc-run" type="number" min="0" value="${escapeHtml(todayData.run)}" oninput="onHealthInput('run', this.value)"/> ${escapeHtml(t('dashboard.min'))}</td></tr>` +
        `<tr><td><i class="fa fa-bed"></i> ${escapeHtml(t('health.sleep'))}</td><td><input id="hc-sleep" type="number" min="0" step="0.5" value="${escapeHtml(todayData.sleep)}" oninput="onHealthInput('sleep', this.value)"/> ${escapeHtml(t('dashboard.h'))}</td></tr>` +
        `<tr><td><i class="fa fa-weight-scale"></i> ${escapeHtml(t('health.weight'))}</td><td><input id="hc-weight" type="number" min="0" step="0.1" value="${escapeHtml(todayData.weight)}" oninput="onHealthInput('weight', this.value)"/> ${escapeHtml(t('dashboard.kg'))}</td></tr>` +
        `<tr><td>${escapeHtml(t('health.bp'))}</td><td><input id="hc-bp-sys" type="number" min="0" placeholder="120" value="${escapeHtml(todayData.bpSys)}" oninput="onHealthInput('bpSys', this.value)" style="width:72px"/> / ` +
        `<input id="hc-bp-dia" type="number" min="0" placeholder="80" value="${escapeHtml(todayData.bpDia)}" oninput="onHealthInput('bpDia', this.value)" style="width:72px"/> ${escapeHtml(t('health.mmHg'))}</td></tr>` +
        '</table>' +
        `<button type="button" class="btn-primary" onclick="saveHealth()">${escapeHtml(t('common.save'))}</button>` +
        '</div>' +
        (hasW
          ? `<div class="card"><div class="section-label">${escapeHtml(t('health.weightTrend'))}</div>${chartBars(weightSeries, wLabels, '#9a7b7b')}</div>`
          : '') +
        (yestData
          ? `<div class="card"><div class="section-label">${escapeHtml(t('health.yesterday', { date: yest }))}</div><p>${escapeHtml(t('health.walk'))} <b>${yestData.walk || t('common.none')}</b> · ${escapeHtml(t('health.run'))} <b>${yestData.run || t('common.none')}</b> · ${escapeHtml(t('health.sleep'))} <b>${yestData.sleep || t('common.none')}</b> · ${escapeHtml(t('health.weight'))} <b>${yestData.weight || t('common.none')}</b> · ${escapeHtml(t('dashboard.bp'))} <b>${yestData.bpSys && yestData.bpDia ? `${yestData.bpSys}/${yestData.bpDia}` : t('common.none')}</b></p></div>`
          : '') +
        (lastWkData
          ? `<div class="card"><div class="section-label">${escapeHtml(t('health.weekAgo', { date: lastWk }))}</div><p>${escapeHtml(t('health.walk'))} <b>${lastWkData.walk || t('common.none')}</b> · ${escapeHtml(t('health.run'))} <b>${lastWkData.run || t('common.none')}</b> · ${escapeHtml(t('health.sleep'))} <b>${lastWkData.sleep || t('common.none')}</b> · ${escapeHtml(t('health.weight'))} <b>${lastWkData.weight || t('common.none')}</b></p></div>`
          : '')
      );
    },
  };
}
