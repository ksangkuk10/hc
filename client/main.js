// client/main.js
// modern ui 스타일 SPA, explorer-dev.conx.xyz vibe

let isLogin = false;

// 날짜 유틸: YYYY-MM-DD 반환 (offsetDays: 0=오늘, -1=전날, -7=일주일전)
function getDate(offsetDays) {
  offsetDays = offsetDays || 0;
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// 서버 데이터 조회 (userId 기준)
async function fetchHealthData(userId) {
  try {
    const res = await fetch('/api/health/' + userId);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (e) { return []; }
}

// 서버 데이터 저장
async function saveHealthData(userId, list) {
  try {
    await fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId, data: list })
    });
  } catch (e) { console.error('저장 실패', e); }
}

const menuItems = [
  { key:'dashboard', label:'대시보드', icon:'fa-solid fa-chart-pie' },
  { key:'health', label:'건강 데이터 기록', icon:'fa-solid fa-heartbeat' },
  { key:'condition', label:'컨디션 분석', icon:'fa-solid fa-face-smile-beam' },
  { key:'food', label:'음식 & 식단 분석', icon:'fa-solid fa-bowl-food' },
  { key:'guide', label:'건강 가이드', icon:'fa-solid fa-book-open' },
  { key:'consult', label:'전문가 상담', icon:'fa-solid fa-user-doctor' },
  { key:'settings', label:'설정', icon:'fa-solid fa-gear' },
];

const routes = {
  dashboard: {
    title: '대시보드',
    render: () => `<h2><i class='fa fa-chart-pie'></i> 대시보드</h2><div class='card'>오늘의 컨디션 요약, 목표 진척도, 리마인더 등 표시</div>`
  },
  health: {
    title: '건강 데이터 기록',
    render: () => {
      const userId = window.UID || 'demo';
      if (!window._hcState) window._hcState = {};
      const state = window._hcState;

      if (!state.data) {
        fetchHealthData(userId).then(function(data) {
          state.data = data;
          render();
        });
        return `<div class='card'><i class='fa fa-spinner fa-spin'></i> 데이터 불러오는 중...</div>`;
      }

      const today  = getDate(0);
      const yest   = getDate(-1);
      const lastWk = getDate(-7);
      let todayData = state.data.find(function(r){ return r.date === today; });
      if (!todayData) {
        todayData = { date: today, walk: '', run: '', sleep: '', weight: '' };
      }
      const yestData   = state.data.find(function(r){ return r.date === yest; });
      const lastWkData = state.data.find(function(r){ return r.date === lastWk; });

      window.onHealthInput = function(k, v) {
        todayData[k] = v;
      };

      window.saveHealth = async function() {
        const others = state.data.filter(function(r){ return r.date !== today; });
        const merged = others.concat([Object.assign({}, todayData)]);
        await saveHealthData(userId, merged);
        state.data = merged;
        alert('저장 완료!');
      };

      return `
        <h2><i class='fa fa-heartbeat'></i> 건강 데이터 기록</h2>
        <div class='card'>
          <div style='font-size:1.1rem;font-weight:bold;margin-bottom:14px;color:#3af2cf'>📅 ${today} 오늘 입력</div>
          <table style='width:100%;border-collapse:separate;border-spacing:0 10px;'>
            <tr>
              <td style='width:120px;color:#a8f5e0'><i class='fa fa-person-walking'></i> 걷기</td>
              <td><input type='number' min='0' id='inp-walk' value='${todayData.walk || ''}'
                oninput="onHealthInput('walk', this.value)"
                style='width:100px;padding:7px 10px;border-radius:7px;border:1.5px solid #22d6b1;background:#183857;color:#a8fff9;font-size:1rem;'> 분</td>
            </tr>
            <tr>
              <td style='color:#a8f5e0'><i class='fa fa-person-running'></i> 달리기</td>
              <td><input type='number' min='0' id='inp-run' value='${todayData.run || ''}'
                oninput="onHealthInput('run', this.value)"
                style='width:100px;padding:7px 10px;border-radius:7px;border:1.5px solid #22d6b1;background:#183857;color:#a8fff9;font-size:1rem;'> 분</td>
            </tr>
            <tr>
              <td style='color:#a8f5e0'><i class='fa fa-bed'></i> 수면</td>
              <td><input type='number' min='0' step='0.5' id='inp-sleep' value='${todayData.sleep || ''}'
                oninput="onHealthInput('sleep', this.value)"
                style='width:100px;padding:7px 10px;border-radius:7px;border:1.5px solid #22d6b1;background:#183857;color:#a8fff9;font-size:1rem;'> 시간</td>
            </tr>
            <tr>
              <td style='color:#a8f5e0'><i class='fa fa-weight-scale'></i> 체중</td>
              <td><input type='number' min='0' step='0.1' id='inp-weight' value='${todayData.weight || ''}'
                oninput="onHealthInput('weight', this.value)"
                style='width:100px;padding:7px 10px;border-radius:7px;border:1.5px solid #22d6b1;background:#183857;color:#a8fff9;font-size:1rem;'> kg</td>
            </tr>
          </table>
          <button onclick='saveHealth()' style='margin-top:16px;padding:10px 32px;background:linear-gradient(90deg,#1debe7,#2fdca4);color:#154954;border:none;border-radius:8px;font-size:1.05rem;font-weight:bold;cursor:pointer;'>저장</button>
        </div>
        ${yestData ? `
        <div class='card'>
          <div style='font-weight:bold;color:#f0c040;margin-bottom:8px'>📊 전날 (${yest}) 데이터</div>
          <span style='margin-right:18px'>🚶 걷기: <b>${yestData.walk || '-'}분</b></span>
          <span style='margin-right:18px'>🏃 달리기: <b>${yestData.run || '-'}분</b></span>
          <span style='margin-right:18px'>🛌 수면: <b>${yestData.sleep || '-'}시간</b></span>
          <span>⚖️ 체중: <b>${yestData.weight || '-'}kg</b></span>
        </div>` : ''}
        ${lastWkData ? `
        <div class='card'>
          <div style='font-weight:bold;color:#a0c4ff;margin-bottom:8px'>📊 1주일 전 (${lastWk}) 데이터</div>
          <span style='margin-right:18px'>🚶 걷기: <b>${lastWkData.walk || '-'}분</b></span>
          <span style='margin-right:18px'>🏃 달리기: <b>${lastWkData.run || '-'}분</b></span>
          <span style='margin-right:18px'>🛌 수면: <b>${lastWkData.sleep || '-'}시간</b></span>
          <span>⚖️ 체중: <b>${lastWkData.weight || '-'}kg</b></span>
        </div>` : ''}
      `;
    }
  },
  condition: {
    title: '컨디션 분석',
    render: () => `<h2><i class='fa fa-face-smile-beam'></i> 컨디션 분석</h2><div class='card'>얼굴 촬영·피로도 분석, 상태 트렌드</div>`
  },
  food: {
    title: '음식 & 식단 분석',
    render: () => `<h2><i class='fa fa-bowl-food'></i> 음식 & 식단 분석</h2><div class='card'>음식 사진 AI 인식, 맞춤 식단 조언</div>`
  },
  guide: {
    title: '건강 가이드',
    render: () => `<h2><i class='fa fa-book-open'></i> 건강 가이드</h2><div class='card'>AI 맞춤 건강 플랜·팁·피드백</div>`
  },
  consult: {
    title: '전문가 상담',
    render: () => `<h2><i class='fa fa-user-doctor'></i> 전문가 상담</h2><div class='card'>의료진/전문가 Q&A, 화상상담 신청</div>`
  },
  settings: {
    title: '설정',
    render: () => `<h2><i class='fa fa-gear'></i> 설정</h2><div class='card'>개인 정보, 웨어러블 연동, 알림 등 설정</div>`
  },
};

function updateNav(selected) {
  if (!isLogin) { document.getElementById('nav').innerHTML = ''; return; }
  document.getElementById('nav').innerHTML = menuItems.map(function(m) {
    return `<button onclick="route('${m.key}')" class="${selected === m.key ? 'active' : ''}"><i class='${m.icon}'></i> ${m.label}</button>`;
  }).join('') +
  `<button onclick="logout()" style='margin-top:17px;background:linear-gradient(90deg,#2fdca4,#ea5b6b);color:#1a2c33'><i class='fa-solid fa-sign-out-alt'></i> 로그아웃</button>`;
}

window.route = function(page) {
  window.location.hash = page;
  render();
};

window.login = function() {
  const uid = document.getElementById('uid').value;
  const pw  = document.getElementById('pw').value;
  if (uid.length < 2 || pw.length < 2) { alert('ID, 비밀번호는 2자 이상 입력!'); return; }
  isLogin = true;
  window.UID = uid;
  window._hcState = {}; // 로그인할 때마다 상태 초기화
  document.getElementById('login-modal').style.display = 'none';
  window.location.hash = 'dashboard';
  render();
};

window.logout = function() {
  isLogin = false;
  window.UID = null;
  window._hcState = {};
  window.location.hash = '';
  render();
};

function renderLogin() {
  const modal = document.getElementById('login-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class='login-card'>
      <h2 style='color:#3af2cf;letter-spacing:1px'>🧬 HealthCare 로그인</h2>
      <input id='uid' placeholder='ID' /><br>
      <input id='pw' type='password' placeholder='비밀번호' /><br>
      <button onclick='login()'>로그인</button>
      <div style='margin-top:12px;color:#b8ffec;font-size:0.98rem'>아직 계정이 없으신가요?<br><a style='color:#51efd2'>회원가입은 관리자를 통해 진행됩니다</a></div>
    </div>`;
}

function render() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  if (!isLogin) {
    renderLogin();
    document.getElementById('main').innerHTML = '';
    document.getElementById('nav').innerHTML = '';
    return;
  }
  document.getElementById('login-modal').style.display = 'none';
  updateNav(hash);
  const page = routes[hash] || routes.dashboard;
  document.getElementById('main').innerHTML = page.render();
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);
