/**
 * UI 字串載入與格式化。介面固定為繁體中文。
 */

/**
 * 載入 data/i18n.json。使用相對路徑以支援 GitHub Pages 子路徑部署。
 * `cache: 'no-cache'` 讓瀏覽器每次都向伺服器確認是否有新版（沒變時只回 304，成本很低）。
 * @returns {Promise<Object>}
 */
export async function loadStrings() {
  const res = await fetch(new URL('../data/i18n.json', import.meta.url), { cache: 'no-cache' });
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
