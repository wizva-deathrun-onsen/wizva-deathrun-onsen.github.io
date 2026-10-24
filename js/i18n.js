/**
 * 語言偏好與 UI 字串。
 * 介面固定為繁體中文；語言切換只影響角色名稱與對話內容。
 */

import { LANGS } from './filters.js';

const STORAGE_KEY = 'wizva-deathrun-onsen:lang';

/**
 * 從 localStorage 讀取語言偏好。storage 被停用或在隱私模式時會 throw，此時回傳 null。
 * @returns {string|null}
 */
export function loadLang() {
  try {
    const v = globalThis.localStorage?.getItem(STORAGE_KEY);
    return LANGS.includes(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * 將語言偏好寫入 localStorage，失敗時靜默忽略（偏好只是便利功能）。
 * @param {string} lang
 */
export function saveLang(lang) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, lang);
  } catch {
    // storage 不可用時不保存偏好。
  }
}

/**
 * 決定初始語言，優先序：URL `lang` → localStorage → 瀏覽器語言 → zh。
 * @param {string|null} fromUrl
 * @param {string|null} fromStorage
 * @param {string} [navigatorLang]
 * @returns {string}
 */
export function resolveLang(fromUrl, fromStorage, navigatorLang = '') {
  if (LANGS.includes(fromUrl)) return fromUrl;
  if (LANGS.includes(fromStorage)) return fromStorage;
  return navigatorLang.toLowerCase().startsWith('ja') ? 'ja' : 'zh';
}

/**
 * 載入 data/i18n.json。使用相對路徑以支援 GitHub Pages 子路徑部署。
 * @returns {Promise<Object>}
 */
export async function loadStrings() {
  const res = await fetch(new URL('../data/i18n.json', import.meta.url));
  if (!res.ok) throw new Error(`i18n.json: HTTP ${res.status}`);
  return res.json();
}

/**
 * 以 `{name}` 佔位符格式化字串。
 * @param {string} template 例如 `顯示 {shown} / {total} 位`
 * @param {Object<string, string|number>} values
 * @returns {string}
 */
export function format(template, values) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
