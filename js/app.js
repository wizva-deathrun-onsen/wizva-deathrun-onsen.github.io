/**
 * 進入點：載入資料、建立篩選 UI、render 表格，並同步篩選狀態到 URL。
 * 所有資料都以 textContent 寫入 DOM，不使用 innerHTML，避免社群回報的資料造成 XSS。
 */

import { REPO_URL, ISSUE_TEMPLATE, SOURCES } from './config.js';
import {
  ALIGNMENTS, ELEMENTS, BONDS,
  defaultState, parseQuery, serializeQuery,
  filterCharacters, sortCharacters, localized,
  buildIssueUrl, collectContributors,
} from './filters.js';
import { loadLang, saveLang, resolveLang, loadStrings, format } from './i18n.js';
import { initThemeToggle } from './theme.js';

/** @type {import('./filters.js').FilterState} */
let state;
/** 目前顯示語言，'zh' | 'ja'。 */
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
  $('#repo-link').href = REPO_URL;
  $('#src-baha').href = SOURCES.baha;
  $('#src-names').href = SOURCES.names;
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
}

/** 把 state 反映回控制項（初始化、重設、瀏覽器上一頁時使用）。 */
function syncControls() {
  for (const input of document.querySelectorAll('.controls input[type=checkbox]')) {
    input.checked = state[input.dataset.key].has(input.value);
  }
  $('#q').value = state.q;
  $('#sort').value = state.sort;
  for (const b of document.querySelectorAll('[data-lang]')) {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  }
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

  const nameCell = cell('colName', localizedText(name, strings.ui.unknown));
  if (!c.verified) {
    nameCell.append(el('span', { className: 'unverified', textContent: strings.ui.unverified, title: strings.ui.unverifiedHint }));
  }

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
    cell('colAvatar', avatar(c, name.text)),
    nameCell,
    cell('colAlignment', badge('alignment', c.alignment)),
    cell('colElement', badge('element', c.element)),
    cell('colRarity', badge('rarity', c.rarity)),
    cell('colOption', option
      ? el('span', { className: 'option', textContent: String(option) })
      : el('span', { className: 'missing', textContent: strings.ui.unknown })),
    cell('colAnswer', localizedText(answer, strings.ui.unknown)),
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
  render();
}

/** 綁定搜尋、排序、語言、重設的事件。 */
function bindEvents() {
  $('#q').addEventListener('input', (e) => {
    state.q = e.target.value.trim();
    update();
  });
  $('#sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    update();
  });
  for (const b of document.querySelectorAll('[data-lang]')) {
    b.addEventListener('click', () => {
      lang = b.dataset.lang;
      saveLang(lang);
      syncControls();
      update();
    });
  }
  $('#reset').addEventListener('click', () => {
    state = defaultState();
    syncControls();
    update();
  });
}

async function loadCharacters() {
  const res = await fetch(new URL('../data/characters.json', import.meta.url));
  if (!res.ok) throw new Error(`characters.json: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  try {
    [strings, characters] = await Promise.all([loadStrings(), loadCharacters()]);
  } catch (err) {
    console.error(err);
    // i18n.json 本身可能就是載入失敗的那個檔案，所以這裡只能寫死文字。
    $('#rows').replaceChildren(el('tr', {}, el('td', { colSpan: 9, className: 'error', textContent: '資料載入失敗，請重新整理頁面' })));
    return;
  }

  state = parseQuery(location.search);
  lang = resolveLang(state.lang, loadLang(), navigator.language);

  applyStaticStrings();
  applyLinks();
  initThemeToggle($('#theme-toggle'), strings.ui);
  buildChips('f-align', 'align', ALIGNMENTS, strings.alignment);
  buildChips('f-elem', 'elem', ELEMENTS, strings.element);
  buildChips('f-bond', 'bond', BONDS, strings.bond);
  $('#contributors').textContent = collectContributors(characters).join('、');
  $('#contributors-line').hidden = !$('#contributors').textContent;

  syncControls();
  bindEvents();
  render();
}

main();
