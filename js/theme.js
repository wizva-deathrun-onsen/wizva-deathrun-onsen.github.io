/**
 * 淺色／深色主題切換。
 * 初次繪製前的主題由 index.html 的 inline script 套用（避免閃爍），本模組負責之後的切換與保存。
 * inline script 使用相同的 STORAGE_KEY 與判斷規則，修改時兩邊需一起改。
 */

/** localStorage 鍵名，需與 index.html 的 inline script 一致。 */
export const THEME_STORAGE_KEY = 'wizvd-deathrun-onsen:theme';

const THEMES = ['light', 'dark'];

/**
 * 決定要套用的主題：使用者選過就用使用者的，否則跟隨系統設定。
 * @param {string|null} stored localStorage 中的值
 * @param {boolean} systemPrefersDark 系統是否為深色模式
 * @returns {'light'|'dark'}
 */
export function resolveTheme(stored, systemPrefersDark) {
  if (THEMES.includes(stored)) return stored;
  return systemPrefersDark ? 'dark' : 'light';
}

/**
 * 回傳切換後的主題。
 * @param {string} current
 * @returns {'light'|'dark'}
 */
export function toggleTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}

/** 讀取使用者選過的主題；storage 不可用時回傳 null。 */
function loadTheme() {
  try {
    const v = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

/** 保存使用者選擇的主題；storage 不可用時靜默忽略。 */
function saveTheme(theme) {
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage 不可用時只在本次瀏覽有效。
  }
}

/**
 * 綁定主題切換按鈕。
 * 使用者還沒手動選過時，會跟著系統設定即時變化；手動切換後就固定為使用者的選擇。
 * @param {HTMLButtonElement} button
 * @param {{themeToLight: string, themeToDark: string}} ui 按鈕的提示文字
 */
export function initThemeToggle(button, ui) {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');

  const apply = (theme) => {
    root.dataset.theme = theme;
    const label = theme === 'dark' ? ui.themeToLight : ui.themeToDark;
    button.setAttribute('aria-label', label);
    button.title = label;
  };

  apply(resolveTheme(loadTheme(), media.matches));

  media.addEventListener('change', (e) => {
    if (!loadTheme()) apply(resolveTheme(null, e.matches));
  });

  button.addEventListener('click', () => {
    const next = toggleTheme(root.dataset.theme);
    saveTheme(next);
    apply(next);
  });
}
