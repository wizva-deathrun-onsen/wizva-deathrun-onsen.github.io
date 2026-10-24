/**
 * 進入點：載入資料、建立篩選 UI、render 表格，並同步篩選狀態到 URL。
 * 所有資料都以 textContent 寫入 DOM，不使用 innerHTML，避免社群回報的資料造成 XSS。
 */

import { REPO_URL, ISSUE_TEMPLATE, SOURCES } from './config.js';
import {
  ALIGNMENTS, ELEMENTS, BONDS,
  defaultState, parseQuery, serializeQuery,
  filterCharacters, sortCharacters, localized,
  buildIssueUrl,
} from './filters.js';
import { loadStrings, format } from './i18n.js';
import { initThemeToggle } from './theme.js';

/** @type {import('./filters.js').FilterState} */
let state;
/** 名稱與對話的顯示語言，預設 'zh'；只能透過 URL `?lang=ja` 切換，頁面上沒有切換按鈕。 */
let lang;
let strings;
let characters = [];

const $ = (sel) => document.querySelector(sel);

/**
 * 建立元素的小工具。
 * @param {string} tag
 * @param {Object} [props] 直接指定到元素上的屬性（className、textContent…）
 * @param {...Node} children
 * @returns {HTMLElement}
 */
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

/** 依 data-i18n 系列屬性套用 UI 字串。 */
function applyStaticStrings() {
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = strings.ui[node.dataset.i18n] ?? node.textContent;
  }
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) {
    node.placeholder = strings.ui[node.dataset.i18nPlaceholder];
  }
  for (const node of document.querySelectorAll('[data-i18n-aria]')) {
    node.setAttribute('aria-label', strings.ui[node.dataset.i18nAria]);
  }
  document.title = strings.ui.title;
}

/** 設定所有外部連結。網址集中於 config.js。 */
function applyLinks() {
  $('#report-all').href = buildIssueUrl(REPO_URL, ISSUE_TEMPLATE);
  $('#src-baha').href = SOURCES.baha;
}

/**
 * 建立一組多選 chip（checkbox）。
 * @param {string} fieldsetId
 * @param {string} key FilterState 中的欄位名
 * @param {string[]} values 可選值
 * @param {Object<string,string>} labels 值對應的顯示文字
 */
function buildChips(fieldsetId, key, values, labels) {
  const fs = document.getElementById(fieldsetId);
  for (const v of values) {
    const input = el('input', { type: 'checkbox', value: v });
    input.dataset.key = key;
    input.addEventListener('change', () => {
      if (input.checked) state[key].add(v); else state[key].delete(v);
      update();
    });
    const label = el('label', { className: `chip chip-${key} chip-${v}` }, input, el('span', { textContent: labels[v] }));
    fs.append(label);
  }

  // 全選／全部取消。按鈕在已經是該狀態時會 disabled，見 syncBulkButtons。
  const bulk = (labelKey, selectAll) => {
    const button = el('button', { type: 'button', className: 'link-button bulk', textContent: strings.ui[labelKey] });
    button.dataset.key = key;
    button.dataset.all = String(selectAll);
    button.addEventListener('click', () => {
      state[key] = new Set(selectAll ? values : []);
      syncControls();
      update();
    });
    return button;
  };
  fs.append(el('span', { className: 'bulk-actions' }, bulk('selectAll', true), bulk('selectNone', false)));
}

/** 依目前勾選數量啟用／停用各組的全選與全部取消按鈕。 */
function syncBulkButtons() {
  const sizes = { align: ALIGNMENTS.length, elem: ELEMENTS.length, bond: BONDS.length };
  for (const button of document.querySelectorAll('.controls .bulk')) {
    const { key, all } = button.dataset;
    button.disabled = all === 'true' ? state[key].size === sizes[key] : state[key].size === 0;
  }
}

/** 把 state 反映回控制項（初始化、重設、瀏覽器上一頁時使用）。 */
function syncControls() {
  for (const input of document.querySelectorAll('.controls input[type=checkbox][data-key]')) {
    input.checked = state[input.dataset.key].has(input.value);
  }
  $('#q').value = state.q;
  $('#known').checked = state.known;
  $('#sort').value = state.sort;
}

/**
 * 建立可能退回另一語言的文字節點；退回時加上標記與提示。
 * @param {{text: string|null, fallback: boolean}} loc
 * @param {string} placeholder 沒有任何資料時顯示的字
 * @returns {HTMLElement}
 */
function localizedText(loc, placeholder) {
  if (!loc.text) return el('span', { className: 'missing', textContent: placeholder });
  const span = el('span', { textContent: loc.text });
  if (loc.fallback) {
    span.className = 'fallback';
    span.title = strings.ui.fallbackHint;
    span.lang = lang === 'ja' ? 'zh-Hant-TW' : 'ja';
  }
  return span;
}

/**
 * 產生一個帶 data-label 的儲存格，手機版卡片排版會用 data-label 顯示欄名。
 * @param {string} labelKey ui 字串鍵
 * @param {...Node} children
 * @returns {HTMLTableCellElement}
 */
function cell(labelKey, ...children) {
  const td = el('td', {}, ...children);
  td.dataset.label = strings.ui[labelKey];
  td.className = labelKey;
  return td;
}

/** 列舉值的徽章；null 時顯示「—」。 */
function badge(group, value) {
  if (value == null) return el('span', { className: 'missing', textContent: strings.ui.none });
  return el('span', { className: `badge ${group}-${value}`, textContent: strings[group][value] });
}

/** 頭像：有圖片時顯示圖片，載入失敗或沒有圖片時顯示名稱首字。 */
function avatar(c, name) {
  const fallback = el('span', { className: 'avatar avatar-fallback', textContent: (name ?? '?').slice(0, 1) });
  fallback.setAttribute('aria-hidden', 'true');
  if (!c.avatar) return fallback;
  const img = el('img', { className: 'avatar', src: c.avatar, alt: '', loading: 'lazy', width: 48, height: 48 });
  img.addEventListener('error', () => img.replaceWith(fallback), { once: true });
  return img;
}

/**
 * 建立一列角色資料。
 * @param {Object} c characters.json 的一筆資料
 * @returns {HTMLTableRowElement}
 */
function renderRow(c) {
  const name = localized(c.name, lang);
  const answer = localized(c.dialogue?.answer, lang);
  const option = c.dialogue?.option;

  // 名稱固定兩行：中文為主、日文為輔，缺少的一方顯示佔位文字，讓每列高度一致。
  const zhLine = el('span', { className: 'name-zh' },
    c.name.zh ? el('span', { textContent: c.name.zh }) : el('span', { className: 'missing', textContent: strings.ui.nameZhMissing }));
  if (!c.verified) {
    zhLine.append(el('span', { className: 'unverified', textContent: strings.ui.unverified, title: strings.ui.unverifiedHint }));
  }
  const jaLine = c.name.ja
    ? el('span', { className: 'name-ja', lang: 'ja', textContent: c.name.ja })
    : el('span', { className: 'name-ja missing', textContent: strings.ui.nameJaMissing });
  const nameCell = cell('colName', zhLine, jaLine);

  // 回報標題固定用中文名，方便維護者搜尋；沒有中文名時用日文名。
  const titleName = c.name.zh ?? c.name.ja ?? c.id;
  const report = el('a', {
    className: 'report',
    href: buildIssueUrl(REPO_URL, ISSUE_TEMPLATE, `${strings.ui.reportTitlePrefix} ${titleName}`),
    target: '_blank',
    rel: 'noopener',
    textContent: strings.ui.report,
  });
  report.setAttribute('aria-label', `${strings.ui.report}：${name.text ?? titleName}`);

  const tr = el('tr', {},
    cell('colNo', c.no == null
      ? el('span', { className: 'missing', textContent: strings.ui.unknown })
      : el('span', { className: 'no', textContent: `No.${c.no}` })),
    cell('colAvatar', avatar(c, name.text)),
    nameCell,
    cell('colAlignment', badge('alignment', c.alignment)),
    cell('colElement', badge('element', c.element)),
    cell('colRarity', badge('rarity', c.rarity)),
    cell('colOption', option
      ? el('span', { className: 'option', textContent: String(option) })
      : el('span', { className: 'missing', textContent: strings.ui.unknown })),
    cell('colAnswer', localizedText(answer, strings.ui.unknown),
      ...(c.contributor ? [el('span', { className: 'contributor', textContent: format(strings.ui.contributedBy, { name: c.contributor }) })] : [])),
    cell('colBond', badge('bond', c.bond)),
    cell('colReport', report),
  );
  tr.dataset.id = c.id;
  return tr;
}

/** 依目前 state 重新 render 表格與計數。 */
function render() {
  const list = sortCharacters(filterCharacters(characters, state), state.sort, lang);
  $('#rows').replaceChildren(...list.map(renderRow));
  $('#empty').hidden = list.length > 0;
  $('#count').textContent = format(strings.ui.count, { shown: list.length, total: characters.length });
  document.documentElement.dataset.lang = lang;
}

/** 將 state 寫回 URL（replaceState，不增加歷史紀錄）。lang 只在非預設時寫入。 */
function writeUrl() {
  const query = serializeQuery({ ...state, lang: lang === 'zh' ? null : lang });
  history.replaceState(null, '', `${location.pathname}${query}${location.hash}`);
}

function update() {
  writeUrl();
  syncBulkButtons();
  render();
}

/** 綁定搜尋、排序、重設的事件。 */
function bindEvents() {
  $('#q').addEventListener('input', (e) => {
    state.q = e.target.value.trim();
    update();
  });
  $('#known').addEventListener('change', (e) => {
    state.known = e.target.checked;
    update();
  });
  $('#sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    update();
  });
  $('#reset').addEventListener('click', () => {
    state = defaultState();
    syncControls();
    update();
  });
}

async function loadCharacters() {
  // 資料最常更新，一律向伺服器確認新版，避免玩家看到舊資料。
  const res = await fetch(new URL('../data/characters.json', import.meta.url), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`characters.json: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  try {
    [strings, characters] = await Promise.all([loadStrings(), loadCharacters()]);
  } catch (err) {
    console.error(err);
    // i18n.json 本身可能就是載入失敗的那個檔案，所以這裡只能寫死文字。
    $('#rows').replaceChildren(el('tr', {}, el('td', { colSpan: 10, className: 'error', textContent: '資料載入失敗，請重新整理頁面' })));
    return;
  }

  state = parseQuery(location.search);
  lang = state.lang ?? 'zh';

  applyStaticStrings();
  applyLinks();
  initThemeToggle($('#theme-toggle'), strings.ui);
  buildChips('f-align', 'align', ALIGNMENTS, strings.alignment);
  buildChips('f-elem', 'elem', ELEMENTS, strings.element);
  buildChips('f-bond', 'bond', BONDS, strings.bond);

  syncControls();
  syncBulkButtons();
  bindEvents();
  render();
}

main();
