import { LOCALE_KEY } from '../config.js';
import { STRINGS } from './strings.js';

export const SUPPORTED_LOCALES = ['en', 'ko', 'ja', 'zh', 'fr', 'de', 'es'];

const DATE_LOCALE_MAP = {
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
};

const HTML_LANG_MAP = {
  en: 'en',
  ko: 'ko',
  ja: 'ja',
  zh: 'zh-Hans',
  fr: 'fr',
  de: 'de',
  es: 'es',
};

let current = 'en';

function pickMessages(locale) {
  return STRINGS[locale] || STRINGS.en;
}

/**
 * @param {string} key flat key e.g. "menu.dashboard"
 * @param {Record<string, string>} [vars] optional {{name}} replacement
 */
export function t(key, vars) {
  const dict = pickMessages(current);
  let s = dict[key];
  if (s === undefined) s = STRINGS.en[key];
  if (s === undefined) return key;
  if (vars && typeof vars === 'object') {
    return s.replace(/\{\{(\w+)\}\}/g, (_, k) =>
      vars[k] != null ? String(vars[k]) : '',
    );
  }
  return s;
}

export function getLocale() {
  return current;
}

export function setLocale(code) {
  if (SUPPORTED_LOCALES.includes(code)) {
    current = code;
    try {
      localStorage.setItem(LOCALE_KEY, code);
    } catch {
      /* */
    }
  }
}

/** 브라우저·OS 언어 → 지원 로케일 (기본 en) */
export function detectBrowserLocale() {
  const tryLang = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    const base = raw.split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(base)) return base;
    if (base === 'zh' || raw.toLowerCase().startsWith('zh')) return 'zh';
    return null;
  };

  if (typeof navigator !== 'undefined' && navigator.languages) {
    for (const l of navigator.languages) {
      const m = tryLang(l);
      if (m) return m;
    }
  }
  const p = tryLang(typeof navigator !== 'undefined' ? navigator.language : '');
  return p || 'en';
}

/**
 * 첫 방문: 저장값 없으면 브라우저 언어 사용. 이후 localStorage 유지.
 */
export function initLocale() {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      current = saved;
      return current;
    }
  } catch {
    /* */
  }
  const detected = detectBrowserLocale();
  current = detected;
  try {
    localStorage.setItem(LOCALE_KEY, current);
  } catch {
    /* */
  }
  return current;
}

export function getDateLocale() {
  return DATE_LOCALE_MAP[current] || 'en-US';
}

export function applyDocumentLang() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = HTML_LANG_MAP[current] || 'en';
}
