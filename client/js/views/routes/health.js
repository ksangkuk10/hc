import { getDate } from '../../utils/date.js';
import { escapeHtml } from '../../utils/html.js';
import { chartBars } from '../../utils/chart.js';

export function createHealthPage(ctx) {
  const { render, loadHealth, saveHealth } = ctx;

  return {
    title: '건강 데이터 기록',
    render() {
      if (!window._hcState) window._hcState = {};
      const state = window._hcState;
      if (state._healthLoading) {
        return "<div class='card'><i class='fa fa-spinner fa-spin'></i> 데이터 불러오는 중...</div>";
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
            alert(e.message || '건강 데이터를 불러오지 못했습니다.');
            render();
          });
        return "<div class='card'><i class='fa fa-spinner fa-spin'></i> 데이터 불러오는 중...</div>";
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
            alert('저장되었습니다.');
            render();
          })
          .catch((e) => {
            alert(e.message || '저장에 실패했습니다. 다시 시도해 주세요.');
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
        '<h2><i class="fa fa-heart-pulse"></i> 건강 데이터 기록</h2>' +
        '<p class="muted small">입력값은 로컬 검증용 데모이며, 실제 의료 결정에는 의료진 상담이 필요합니다.</p>' +
        '<div class="card">' +
        `<div class='section-label'>📅 ${today} 오늘 입력</div>` +
        '<table class="form-table">' +
        `<tr><td><i class="fa fa-person-walking"></i> 걷기</td><td><input id="hc-walk" type="number" min="0" value="${escapeHtml(todayData.walk)}" oninput="onHealthInput('walk', this.value)"/> 분</td></tr>` +
        `<tr><td><i class="fa fa-person-running"></i> 달리기</td><td><input id="hc-run" type="number" min="0" value="${escapeHtml(todayData.run)}" oninput="onHealthInput('run', this.value)"/> 분</td></tr>` +
        `<tr><td><i class="fa fa-bed"></i> 수면</td><td><input id="hc-sleep" type="number" min="0" step="0.5" value="${escapeHtml(todayData.sleep)}" oninput="onHealthInput('sleep', this.value)"/> 시간</td></tr>` +
        `<tr><td><i class="fa fa-weight-scale"></i> 체중</td><td><input id="hc-weight" type="number" min="0" step="0.1" value="${escapeHtml(todayData.weight)}" oninput="onHealthInput('weight', this.value)"/> kg</td></tr>` +
        `<tr><td>혈압 (수축/이완)</td><td><input id="hc-bp-sys" type="number" min="0" placeholder="120" value="${escapeHtml(todayData.bpSys)}" oninput="onHealthInput('bpSys', this.value)" style="width:72px"/> / ` +
        `<input id="hc-bp-dia" type="number" min="0" placeholder="80" value="${escapeHtml(todayData.bpDia)}" oninput="onHealthInput('bpDia', this.value)" style="width:72px"/> mmHg</td></tr>` +
        '</table>' +
        '<button type="button" class="btn-primary" onclick="saveHealth()">저장</button>' +
        '</div>' +
        (hasW
          ? `<div class="card"><div class="section-label">체중 추세 (14일)</div>${chartBars(weightSeries, wLabels, '#9a7b7b')}</div>`
          : '') +
        (yestData
          ? `<div class="card"><div class="section-label">전날 (${yest})</div><p>걷기 <b>${yestData.walk || '—'}</b>분 · 달리기 <b>${yestData.run || '—'}</b>분 · 수면 <b>${yestData.sleep || '—'}</b>h · 체중 <b>${yestData.weight || '—'}</b>kg · 혈압 <b>${yestData.bpSys && yestData.bpDia ? `${yestData.bpSys}/${yestData.bpDia}` : '—'}</b></p></div>`
          : '') +
        (lastWkData
          ? `<div class="card"><div class="section-label">1주일 전 (${lastWk})</div><p>걷기 <b>${lastWkData.walk || '—'}</b>분 · 달리기 <b>${lastWkData.run || '—'}</b>분 · 수면 <b>${lastWkData.sleep || '—'}</b>h · 체중 <b>${lastWkData.weight || '—'}</b>kg</p></div>`
          : '')
      );
    },
  };
}
