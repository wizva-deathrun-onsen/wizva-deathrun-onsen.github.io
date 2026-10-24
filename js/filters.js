/**
 * 篩選、排序、搜尋與 URL query 轉換。
 * 本檔只放純函式（不碰 DOM、不讀寫 storage），以便用 node:test 單元測試。
 */

/** 性格的所有可能值，順序即預設排序與 UI 顯示順序。 */
export const ALIGNMENTS = ['good', 'neutral', 'evil'];

/** 屬性的所有可能值。 */
export const ELEMENTS = ['light', 'dark', 'water', 'fire', 'wind', 'earth', 'none'];

/** 緣份的所有可能值，順序即排序順序。 */
export const BONDS = ['str', 'int', 'agi', 'fai', 'luk', 'spi'];

/** 可用的排序鍵。 */
export const SORT_KEYS = ['alignment', 'no', 'name', 'bond'];

/** 支援的語言。 */
export const LANGS = ['zh', 'ja'];

/**
 * 篩選狀態。
 * @typedef {Object} FilterState
 * @property {Set<string>} align 選取的性格
 * @property {Set<string>} elem 選取的屬性
 * @property {Set<string>} bond 選取的緣份
 * @property {string} q 搜尋關鍵字
 * @property {boolean} known 只顯示已有對話資料（選項或選項內容至少有一項）的角色
 * @property {string} sort 排序鍵，見 SORT_KEYS
 * @property {string|null} lang 語言；null 表示 URL 未指定
 */

/**
 * 回傳預設（不限制、不搜尋）的篩選狀態。清單維度為空集合代表「不篩選」。
 * @returns {FilterState}
 */
export function defaultState() {
  return {
    align: new Set(),
    elem: new Set(),
    bond: new Set(),
    q: '',
    known: true,
    sort: 'alignment',
    lang: null,
  };
}

/**
 * 解析逗號分隔的清單參數，只保留合法值。
 * 參數不存在或為空字串時回傳空集合（不篩選）。
 * @param {URLSearchParams} params
 * @param {string} key
 * @param {string[]} allowed
 * @returns {Set<string>}
 */
function parseList(params, key, allowed) {
  const values = (params.get(key) ?? '').split(',').map((v) => v.trim());
  return new Set(values.filter((v) => allowed.includes(v)));
}

/**
 * 將 URL query string 解析成篩選狀態，不合法的值會被忽略。
 * @param {string} search 例如 `?align=good,evil&lang=ja`
 * @returns {FilterState}
 */
export function parseQuery(search) {
  const params = new URLSearchParams(search);
  const sort = params.get('sort');
  const lang = params.get('lang');
  return {
    align: parseList(params, 'align', ALIGNMENTS),
    elem: parseList(params, 'elem', ELEMENTS),
    bond: parseList(params, 'bond', BONDS),
    q: (params.get('q') ?? '').trim(),
    known: params.get('show') !== 'all',
    sort: SORT_KEYS.includes(sort) ? sort : 'alignment',
    lang: LANGS.includes(lang) ? lang : null,
  };
}

/**
 * 將篩選狀態轉回 query string。與預設值相同的欄位會省略，讓分享網址保持精簡。
 * 清單依常數順序輸出，確保同一狀態永遠得到同一字串。
 * @param {FilterState} state
 * @returns {string} 以 `?` 開頭；全為預設值時回傳空字串
 */
export function serializeQuery(state) {
  const params = new URLSearchParams();
  const lists = [['align', state.align, ALIGNMENTS], ['elem', state.elem, ELEMENTS], ['bond', state.bond, BONDS]];
  for (const [key, set, allowed] of lists) {
    if (set.size > 0) {
      params.set(key, allowed.filter((v) => set.has(v)).join(','));
    }
  }
  if (state.q) params.set('q', state.q);
  if (!state.known) params.set('show', 'all');
  if (state.sort && state.sort !== 'alignment') params.set('sort', state.sort);
  if (state.lang) params.set('lang', state.lang);
  const str = params.toString().replaceAll('%2C', ',');
  return str ? `?${str}` : '';
}

/**
 * 判斷某個維度是否通過篩選。
 * 沒有選任何值時不限制（未知值 null 也顯示）；有選值時只保留選到的，null 視為不符合。
 * @param {Set<string>} selected
 * @param {string|null} value
 * @returns {boolean}
 */
function matchesSet(selected, value) {
  if (selected.size === 0) return true;
  return value != null && selected.has(value);
}

/**
 * 正規化字串以做寬鬆比對：NFKC（全形半形統一）＋小寫。
 * @param {string} s
 * @returns {string}
 */
function normalize(s) {
  return s.normalize('NFKC').toLowerCase();
}

/**
 * 判斷角色是否符合搜尋關鍵字。比對編號、中日文名稱與中日文選項內容，不分大小寫與全半形。
 * @param {Object} character characters.json 中的一筆資料
 * @param {string} q
 * @returns {boolean}
 */
export function matchesQuery(character, q) {
  const needle = normalize(q.trim());
  if (!needle) return true;
  const haystack = [
    character.no == null ? null : String(character.no),
    character.name?.zh,
    character.name?.ja,
    character.dialogue?.answer?.zh,
    character.dialogue?.answer?.ja,
  ];
  return haystack.some((s) => s && normalize(s).includes(needle));
}

/**
 * 判斷角色是否已有送死流對話資料：知道正確選項，或有任一語言的選項內容。
 * @param {Object} character
 * @returns {boolean}
 */
export function hasDialogue(character) {
  const d = character.dialogue;
  return d?.option != null || Boolean(d?.answer?.zh) || Boolean(d?.answer?.ja);
}

/**
 * 依篩選狀態過濾角色清單，不改變原陣列與順序。
 * @param {Object[]} characters
 * @param {FilterState} state
 * @returns {Object[]}
 */
export function filterCharacters(characters, state) {
  return characters.filter((c) =>
    matchesSet(state.align, c.alignment)
    && matchesSet(state.elem, c.element)
    && matchesSet(state.bond, c.bond)
    && (!state.known || hasDialogue(c))
    && matchesQuery(c, state.q));
}

/**
 * 取得雙語欄位（如 name、dialogue.answer）在指定語言的文字，缺少時退回另一語言。
 * @param {{zh: string|null, ja: string|null}|undefined} field
 * @param {string} lang 'zh' | 'ja'
 * @returns {{text: string|null, fallback: boolean}} fallback 為 true 表示顯示的是另一語言
 */
export function localized(field, lang) {
  const other = lang === 'ja' ? 'zh' : 'ja';
  if (field?.[lang]) return { text: field[lang], fallback: false };
  if (field?.[other]) return { text: field[other], fallback: true };
  return { text: null, fallback: false };
}

/**
 * 依序比較兩個值在給定順序表中的位置；不在表中（含 null）一律排最後。
 * @param {string[]} order
 * @returns {(a: string|null, b: string|null) => number}
 */
function byOrder(order) {
  const rank = (v) => {
    const i = order.indexOf(v);
    return i === -1 ? order.length : i;
  };
  return (a, b) => rank(a) - rank(b);
}

/**
 * 排序角色清單，回傳新陣列。
 * 一律先依編號排序（未知排最後），再依選擇的鍵排序；Array.prototype.sort 為 stable，
 * 所以選擇的鍵相同時會維持編號順序。
 * - alignment：依性格（善→中立→惡→未標註）
 * - no：依角色編號，未知排最後
 * - name：依目前語言的名稱，locale-aware
 * - bond：依緣份 力→靈，未知排最後
 * @param {Object[]} characters
 * @param {string} key 見 SORT_KEYS
 * @param {string} lang 'zh' | 'ja'
 * @returns {Object[]}
 */
export function sortCharacters(characters, key, lang) {
  const no = (c) => c.no ?? Infinity;
  const list = [...characters].sort((a, b) => no(a) - no(b));
  switch (key) {
    case 'name': {
      const collator = new Intl.Collator(lang === 'ja' ? 'ja' : 'zh-Hant-TW');
      const name = (c) => localized(c.name, lang).text ?? '';
      return list.sort((a, b) => collator.compare(name(a), name(b)));
    }
    case 'no':
      return list;
    case 'bond':
      return list.sort((a, b) => byOrder(BONDS)(a.bond, b.bond));
    default:
      return list.sort((a, b) => byOrder(ALIGNMENTS)(a.alignment, b.alignment));
  }
}

/**
 * 組出 GitHub new issue 網址，帶入 Issue Form 範本、預填標題與欄位。
 * @param {string} repoUrl 例如 `https://github.com/owner/repo`
 * @param {string} template Issue Form 檔名
 * @param {string} [title] 預填的 issue 標題；省略則不帶
 * @param {Object<string, string|null>} [fields] 以 Issue Form 欄位 id 為鍵的預填值；空值會略過
 * @returns {string}
 */
export function buildIssueUrl(repoUrl, template, title, fields = {}) {
  const params = new URLSearchParams({ template });
  if (title) params.set('title', title);
  for (const [id, value] of Object.entries(fields)) {
    if (value) params.set(id, value);
  }
  return `${repoUrl.replace(/\/+$/, '')}/issues/new?${params}`;
}

