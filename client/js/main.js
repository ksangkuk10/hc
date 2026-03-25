import { api, getToken, setToken } from './api/http.js';
import * as services from './api/services.js';
import { getDate } from './utils/date.js';
import { escapeHtml } from './utils/html.js';
import { chartBars } from './utils/chart.js';
import { fileToBase64 } from './utils/file.js';
import { getMenuItems } from './views/menu.js';
import { createRoutes } from './views/routes/index.js';
import { LAST_LOGIN_EMAIL_KEY } from './config.js';
import {
  initLocale,
  applyDocumentLang,
  t,
  setLocale,
  getLocale,
  getDateLocale,
  SUPPORTED_LOCALES,
} from './i18n/core.js';

initLocale();
applyDocumentLang();
if (typeof document !== 'undefined') {
  document.title = t('app.documentTitle');
}

const LANG_OPTIONS = [
  ['en', 'English'],
  ['ko', '한국어'],
  ['ja', '日本語'],
  ['zh', '中文'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['es', 'Español'],
];

function langSelectHtml(selectId) {
  const cur = getLocale();
  const idAttr = selectId ? ` id="${escapeHtml(selectId)}"` : '';
  return (
    '<label class="sr-only" for="' +
    escapeHtml(selectId || 'app-lang') +
    '">' +
    escapeHtml(t('lang.label')) +
    '</label>' +
    '<select' +
    idAttr +
    ' class="header-lang-select" onchange="setAppLanguage(this.value)" aria-label="' +
    escapeHtml(t('lang.label')) +
    '">' +
    LANG_OPTIONS.map(
      ([code, label]) =>
        `<option value="${escapeHtml(code)}"${cur === code ? ' selected' : ''}>${escapeHtml(label)}</option>`,
    ).join('') +
    '</select>'
  );
}

function getLastLoginEmail() {
  try {
    return localStorage.getItem(LAST_LOGIN_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

function setLastLoginEmail(email) {
  const e = String(email || '').trim();
  if (!e) return;
  try {
    localStorage.setItem(LAST_LOGIN_EMAIL_KEY, e);
  } catch {
    /* */
  }
}

let isLogin = false;
let routes = {};

/** 로그인/가입 직후: 화면 캐시를 현재 세션용으로 초기화 */
function resetCachesForNewSession() {
  window._hcState = {};
  window._hcDash = { loading: true };
  window._hcCond = { list: null, loading: true, analyzing: false };
  window._hcFood = { list: null, loading: true, analyzing: false };
  window._hcConsult = { list: null, loading: true, aiBusy: false };
  window._hcSet = { settings: null, loading: true };
  window._hcContactPage = { loading: false, error: null, aiText: null, note: '', model: '' };
}

/** 로그아웃: 이전 사용자 건강·상담 등 데이터가 메모리에 남지 않도록 제거 */
function clearCachesOnLogout() {
  window._hcState = {};
  window._hcDash = null;
  window._hcCond = null;
  window._hcFood = null;
  window._hcConsult = null;
  window._hcSet = null;
  window._hcContactPage = null;
}

function updateHeaderProfile() {
  const el = document.getElementById('header-profile');
  if (!el) return;
  if (!isLogin) {
    el.innerHTML = '';
    return;
  }
  api('/api/auth/me')
    .then((me) => {
      el.innerHTML =
        '<span class="header-profile-main">' +
        `<span class="hp-name">${escapeHtml(me.name || me.email || '')}</span>` +
        `<button type="button" class="hp-btn" onclick="location.hash='settings'" title="${escapeHtml(t('nav.settingsTitle'))}"><i class="fa fa-user-circle"></i></button>` +
        '</span>' +
        '<span class="header-lang-wrap">' +
        langSelectHtml('header-lang') +
        '</span>';
    })
    .catch(() => {
      el.innerHTML = '<span class="header-lang-wrap">' + langSelectHtml('header-lang') + '</span>';
    });
}

function updateNav(selected) {
  if (!isLogin) {
    document.getElementById('nav').innerHTML = '';
    return;
  }
  const items = getMenuItems(t);
  document.getElementById('nav').innerHTML =
    items
      .map(
        (m) =>
          `<button type="button" onclick="route('${m.key}')" class="${selected === m.key ? 'active' : ''}"><i class="${m.icon}"></i> ${escapeHtml(m.label)}</button>`,
      )
      .join('') +
    `<button type="button" onclick="logout()" class="nav-logout"><i class="fa-solid fa-sign-out-alt"></i> ${escapeHtml(t('nav.logout'))}</button>`;
}

function render() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  document.title = t('app.documentTitle');
  if (!isLogin) {
    renderLogin();
    document.getElementById('main').innerHTML = '';
    document.getElementById('nav').innerHTML = '';
    return;
  }
  document.getElementById('login-modal').style.display = 'none';
  updateNav(hash);
  updateHeaderProfile();
  const page = routes[hash] || routes.dashboard;
  document.getElementById('main').innerHTML = page.render();
}

function renderLogin() {
  const modal = document.getElementById('login-modal');
  const lastEmail = escapeHtml(getLastLoginEmail());
  modal.style.display = 'flex';
  modal.innerHTML =
    '<div class="login-card">' +
    '<div class="login-lang-row">' +
    langSelectHtml('login-lang') +
    '</div>' +
    '<h2 style="color:#1a1a1a;letter-spacing:0.08em;font-weight:700;text-transform:uppercase">' +
    escapeHtml(t('app.title')) +
    '</h2>' +
    '<p class="muted small" style="margin-bottom:16px">' +
    escapeHtml(t('login.tagline')) +
    '</p>' +
    '<div class="login-tabs">' +
    '<button type="button" id="tab-login" class="active" onclick="showLoginTab(\'login\')">' +
    escapeHtml(t('login.tabLogin')) +
    '</button>' +
    '<button type="button" id="tab-register" onclick="showLoginTab(\'register\')">' +
    escapeHtml(t('login.tabRegister')) +
    '</button>' +
    '</div>' +
    '<div id="panel-login">' +
    '<input id="uid" type="email" placeholder="' +
    escapeHtml(t('login.email')) +
    '" autocomplete="username" value="' +
    lastEmail +
    '"/>' +
    '<input id="pw" type="password" placeholder="' +
    escapeHtml(t('login.password')) +
    '" autocomplete="current-password"/>' +
    '<button type="button" onclick="login()">' +
    escapeHtml(t('login.signIn')) +
    '</button>' +
    '</div>' +
    '<div id="panel-register" style="display:none">' +
    '<input id="reg-email" type="email" placeholder="' +
    escapeHtml(t('login.email')) +
    '" value="' +
    lastEmail +
    '"/>' +
    '<input id="reg-name" placeholder="' +
    escapeHtml(t('login.name')) +
    '"/>' +
    '<input id="reg-pw" type="password" placeholder="' +
    escapeHtml(t('login.passwordHint')) +
    '"/>' +
    '<button type="button" onclick="register()">' +
    escapeHtml(t('login.registerCta')) +
    '</button>' +
    '</div>' +
    '<div class="muted small" style="margin-top:14px">' +
    escapeHtml(t('login.footer')) +
    '</div>' +
    '</div>';
}

function showLoginTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('panel-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('panel-register').style.display = tab === 'register' ? 'block' : 'none';
}

function tryRestoreSession() {
  if (!getToken()) {
    isLogin = false;
    render();
    return;
  }
  api('/api/auth/me')
    .then(() => {
      isLogin = true;
      render();
    })
    .catch(() => {
      setToken(null);
      isLogin = false;
      render();
    });
}

const ctx = {
  get render() {
    return render;
  },
  api,
  getDate,
  escapeHtml,
  chartBars,
  fileToBase64,
  updateHeaderProfile,
  t,
  getDateLocale,
  ...services,
};

routes = createRoutes(ctx);

window.route = function (page) {
  window.location.hash = page;
  render();
};

window.setAppLanguage = function (code) {
  if (!SUPPORTED_LOCALES.includes(code)) return;
  setLocale(code);
  applyDocumentLang();
  document.title = t('app.documentTitle');
  render();
};

window.login = function () {
  const email = document.getElementById('uid').value;
  const pw = document.getElementById('pw').value;
  setLastLoginEmail(email);
  api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: pw }) })
    .then((j) => {
      setToken(j.token);
      isLogin = true;
      resetCachesForNewSession();
      document.getElementById('login-modal').style.display = 'none';
      window.location.hash = 'dashboard';
      updateHeaderProfile();
      render();
    })
    .catch((e) => {
      alert(e.message || t('login.fail'));
    });
};

window.register = function () {
  const email = document.getElementById('reg-email').value;
  const name = document.getElementById('reg-name').value;
  const pw = document.getElementById('reg-pw').value;
  setLastLoginEmail(email);
  api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: pw, name }),
  })
    .then((j) => {
      setToken(j.token);
      isLogin = true;
      resetCachesForNewSession();
      document.getElementById('login-modal').style.display = 'none';
      window.location.hash = 'dashboard';
      updateHeaderProfile();
      render();
    })
    .catch((e) => {
      alert(e.message || t('login.registerFail'));
    });
};

window.logout = function () {
  api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
  setToken(null);
  isLogin = false;
  clearCachesOnLogout();
  window.location.hash = '';
  updateHeaderProfile();
  render();
};

window.addEventListener('hashchange', () => {
  const h = window.location.hash.replace('#', '') || 'dashboard';
  if (isLogin && h === 'health' && window._hcState) {
    window._hcState.forceHealthReload = true;
  }
  render();
});
window.addEventListener('DOMContentLoaded', tryRestoreSession);
window.showLoginTab = showLoginTab;
