import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

import {
  ALIGNMENTS, ELEMENTS, BONDS,
  defaultState, parseQuery, serializeQuery,
  matchesQuery, filterCharacters, sortCharacters, hasDialogue,
  localized, buildIssueUrl,
} from '../js/filters.js';
import { format } from '../js/i18n.js';

/** 建立測試用角色，未指定的欄位為 null。 */
function make(id, overrides = {}) {
  return {
    id,
    name: { zh: null, ja: null },
    avatar: null,
    alignment: null,
    element: null,
    rarity: null,
    dialogue: { option: null, answer: { zh: null, ja: null } },
    bond: null,
    contributors: [],
    verified: true,
    ...overrides,
  };
}

const daniel = make('daniel', {
  name: { zh: '丹尼爾', ja: 'ダニエル' },
  alignment: 'good', element: 'earth', bond: 'str',
  dialogue: { option: 2, answer: { zh: '得到上帝寬恕', ja: null } },
});
const adam = make('adam', {
  name: { zh: '亞當', ja: null },
  alignment: 'evil', element: 'light', bond: 'int',
  dialogue: { option: 1, answer: { zh: '為了尋求豐厚的回報', ja: null } },
});
const savia = make('savia', {
  name: { zh: '薩維亞', ja: null },
  alignment: 'evil',
  dialogue: { option: 1, answer: { zh: null, ja: '今を楽しめ' } },
});
const unknown = make('alex', { name: { zh: '亞曆克斯', ja: null }, dialogue: { option: 1, answer: { zh: '名聲', ja: null } } });
const philip = make('philip', {
  name: { zh: '菲利普', ja: null }, alignment: 'neutral', element: 'water', bond: 'agi',
  dialogue: { option: 1, answer: { zh: '與故人有關聯的人', ja: null } },
});
const ALL = [daniel, adam, savia, unknown, philip];

describe('parseQuery / serializeQuery', () => {
  test('空 query 得到未篩選的預設值', () => {
    const s = parseQuery('');
    assert.equal(s.align.size, 0);
    assert.equal(s.elem.size, 0);
    assert.equal(s.bond.size, 0);
    assert.equal(s.q, '');
    assert.equal(s.sort, 'alignment');
    assert.equal(s.lang, null);
    assert.equal(s.known, true);
  });

  test('show=all 關閉「只顯示已有對話資料」並可 round-trip', () => {
    assert.equal(parseQuery('?show=all').known, false);
    const s = defaultState();
    s.known = false;
    assert.equal(serializeQuery(s), '?show=all');
    assert.equal(parseQuery(serializeQuery(s)).known, false);
  });

  test('解析清單並忽略不合法值', () => {
    const s = parseQuery('?align=good,evil,chaos&elem=fire&lang=ja&sort=bond&q=%20丹%20');
    assert.deepEqual([...s.align], ['good', 'evil']);
    assert.deepEqual([...s.elem], ['fire']);
    assert.equal(s.lang, 'ja');
    assert.equal(s.sort, 'bond');
    assert.equal(s.q, '丹');
  });

  test('空字串參數視同未篩選', () => {
    assert.equal(parseQuery('?align=').align.size, 0);
  });

  test('不合法的 sort / lang 退回預設', () => {
    const s = parseQuery('?sort=option&lang=en');
    assert.equal(s.sort, 'alignment');
    assert.equal(s.lang, null);
  });

  test('預設狀態序列化為空字串', () => {
    assert.equal(serializeQuery(defaultState()), '');
  });

  test('清單依常數順序輸出且不編碼逗號', () => {
    const s = defaultState();
    s.align = new Set(['evil', 'good']);
    s.elem = new Set(['fire']);
    s.lang = 'ja';
    assert.equal(serializeQuery(s), '?align=good,evil&elem=fire&lang=ja');
  });

  test('序列化後再解析得到相同狀態（round-trip）', () => {
    const s = defaultState();
    s.align = new Set();
    s.bond = new Set(['luk', 'str']);
    s.q = '丹尼爾 & 亞當';
    s.sort = 'name';
    const back = parseQuery(serializeQuery(s));
    assert.deepEqual([...back.align], []);
    assert.deepEqual([...back.bond], ['str', 'luk']);
    assert.equal(back.q, s.q);
    assert.equal(back.sort, 'name');
  });
});

describe('hasDialogue', () => {
  test('有選項或任一語言的選項內容即算有資料', () => {
    assert.ok(hasDialogue(make('a', { dialogue: { option: 2, answer: { zh: null, ja: null } } })));
    assert.ok(hasDialogue(make('b', { dialogue: { option: null, answer: { zh: '名聲', ja: null } } })));
    assert.ok(hasDialogue(make('c', { dialogue: { option: null, answer: { zh: null, ja: '今を楽しめ' } } })));
    assert.ok(!hasDialogue(make('d')));
  });
});

describe('matchesQuery', () => {
  test('比對中文名、日文名與選項內容', () => {
    assert.ok(matchesQuery(daniel, '丹尼'));
    assert.ok(matchesQuery(daniel, 'ダニエル'));
    assert.ok(matchesQuery(daniel, '上帝'));
    assert.ok(matchesQuery(savia, '楽しめ'));
    assert.ok(!matchesQuery(daniel, '亞當'));
  });

  test('比對編號', () => {
    assert.ok(matchesQuery(make('d', { no: 2016 }), '2016'));
    assert.ok(!matchesQuery(make('d', { no: null }), '2016'));
  });

  test('空白關鍵字視為全部符合', () => {
    assert.ok(matchesQuery(daniel, '   '));
  });

  test('全形半形與大小寫不敏感', () => {
    const c = make('x', { name: { zh: 'Abc', ja: null } });
    assert.ok(matchesQuery(c, 'ＡＢＣ'));
  });
});

describe('filterCharacters', () => {
  test('未選任何值時包含欄位為 null 的角色', () => {
    assert.equal(filterCharacters(ALL, defaultState()).length, ALL.length);
  });

  test('known 預設開啟，隱藏沒有對話資料的角色', () => {
    const blank = make('blank');
    const s = defaultState();
    assert.equal(s.known, true);
    assert.deepEqual(filterCharacters([daniel, blank], s).map((c) => c.id), ['daniel']);
    s.known = false;
    assert.deepEqual(filterCharacters([daniel, blank], s).map((c) => c.id), ['daniel', 'blank']);
  });

  test('依性格篩選並排除未標註性格', () => {
    const s = defaultState();
    s.align = new Set(['evil']);
    assert.deepEqual(filterCharacters(ALL, s).map((c) => c.id), ['adam', 'savia']);
  });

  test('依屬性與緣份篩選', () => {
    const s = defaultState();
    s.elem = new Set(['earth', 'water']);
    assert.deepEqual(filterCharacters(ALL, s).map((c) => c.id), ['daniel', 'philip']);
    s.elem = new Set();
    s.bond = new Set(['int']);
    assert.deepEqual(filterCharacters(ALL, s).map((c) => c.id), ['adam']);
  });

  test('全選時排除該欄位為 null 的角色', () => {
    const s = defaultState();
    s.align = new Set(ALIGNMENTS);
    assert.deepEqual(filterCharacters(ALL, s).map((c) => c.id), ['daniel', 'adam', 'savia', 'philip']);
  });

  test('多條件為 AND', () => {
    const s = defaultState();
    s.align = new Set(['evil']);
    s.q = '回報';
    assert.deepEqual(filterCharacters(ALL, s).map((c) => c.id), ['adam']);
  });

  test('不修改原陣列', () => {
    const copy = [...ALL];
    filterCharacters(ALL, parseQuery('?align=good'));
    assert.deepEqual(ALL, copy);
  });
});

describe('sortCharacters', () => {
  test('alignment 依性格排序，未標註排最後，同性格依編號', () => {
    const list = [
      make('g2', { alignment: 'good', no: 2016 }),
      make('e1', { alignment: 'evil', no: 2001 }),
      make('g1', { alignment: 'good', no: 68 }),
      make('u', { no: 1 }),
    ];
    assert.deepEqual(sortCharacters(list, 'alignment', 'zh').map((c) => c.id), ['g1', 'g2', 'e1', 'u']);
  });

  test('任何排序在同值時都依編號，編號未知排最後', () => {
    const list = [make('x', { bond: 'str' }), make('b', { bond: 'str', no: 2016 }), make('a', { bond: 'str', no: 68 })];
    assert.deepEqual(sortCharacters(list, 'bond', 'zh').map((c) => c.id), ['a', 'b', 'x']);
  });

  test('舊的 sort=default 連結退回性格排序', () => {
    assert.equal(parseQuery('?sort=default').sort, 'alignment');
  });


  test('no 依編號排序，未知排最後', () => {
    const list = [make('x'), make('b', { no: 2016 }), make('a', { no: 68 })];
    assert.deepEqual(sortCharacters(list, 'no', 'zh').map((c) => c.id), ['a', 'b', 'x']);
  });

  test('bond 依力→靈排序，未知排最後', () => {
    assert.deepEqual(sortCharacters([savia, philip, adam, daniel], 'bond', 'zh').map((c) => c.id),
      ['daniel', 'adam', 'philip', 'savia']);
  });

  test('name 依目前語言排序，缺少時使用另一語言', () => {
    const a = make('a', { name: { zh: null, ja: 'アネモネ' } });
    const b = make('b', { name: { zh: '乙', ja: 'イ' } });
    assert.deepEqual(sortCharacters([b, a], 'name', 'ja').map((c) => c.id), ['a', 'b']);
  });

  test('回傳新陣列', () => {
    const out = sortCharacters(ALL, 'bond', 'zh');
    assert.notEqual(out, ALL);
  });
});

describe('localized', () => {
  test('優先使用指定語言', () => {
    assert.deepEqual(localized(daniel.name, 'ja'), { text: 'ダニエル', fallback: false });
  });
  test('缺少時退回另一語言並標記 fallback', () => {
    assert.deepEqual(localized(adam.name, 'ja'), { text: '亞當', fallback: true });
  });
  test('兩語言都沒有時回傳 null', () => {
    assert.deepEqual(localized({ zh: null, ja: null }, 'zh'), { text: null, fallback: false });
    assert.deepEqual(localized(undefined, 'zh'), { text: null, fallback: false });
  });
});

describe('buildIssueUrl', () => {
  test('帶入 template 與編碼後的標題', () => {
    const url = buildIssueUrl('https://github.com/o/r/', 'dialogue-report.yml', '[資料回報] 丹尼爾');
    const u = new URL(url);
    assert.equal(u.origin + u.pathname, 'https://github.com/o/r/issues/new');
    assert.equal(u.searchParams.get('template'), 'dialogue-report.yml');
    assert.equal(u.searchParams.get('title'), '[資料回報] 丹尼爾');
  });
  test('預填欄位並略過空值', () => {
    const u = new URL(buildIssueUrl('https://github.com/o/r', 't.yml', 'x', { name_zh: '丹尼爾', name_ja: null }));
    assert.equal(u.searchParams.get('name_zh'), '丹尼爾');
    assert.ok(!u.searchParams.has('name_ja'));
  });

  test('省略標題時不帶 title 參數', () => {
    assert.ok(!buildIssueUrl('https://github.com/o/r', 't.yml').includes('title='));
  });
});

describe('i18n helpers', () => {
  test('format 替換佔位符並保留未知鍵', () => {
    assert.equal(format('{shown}/{total} {x}', { shown: 1, total: 2 }), '1/2 {x}');
  });
});

describe('data/characters.json', () => {
  const data = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
  const i18n = JSON.parse(readFileSync(new URL('../data/i18n.json', import.meta.url), 'utf8'));

  test('id 唯一且為 kebab-case', () => {
    const ids = data.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test('列舉欄位只使用合法值或 null', () => {
    for (const c of data) {
      assert.ok(c.alignment === null || ALIGNMENTS.includes(c.alignment), c.id);
      assert.ok(c.element === null || ELEMENTS.includes(c.element), c.id);
      assert.ok(c.bond === null || BONDS.includes(c.bond), c.id);
      assert.ok(c.rarity === null || ['nameless', 'named', 'legendary'].includes(c.rarity), c.id);
      assert.ok(c.dialogue.option === null || [1, 2, 3].includes(c.dialogue.option), c.id);
      assert.ok(c.name.zh || c.name.ja, `${c.id} 至少需要一種語言的名稱`);
      assert.ok(c.no === null || Number.isInteger(c.no), `${c.id} 編號需為整數或 null`);
      assert.equal(typeof c.verified, 'boolean', c.id);
    }
  });

  test('avatar 為相對路徑且檔案存在', () => {
    for (const c of data) {
      if (c.avatar === null) continue;
      assert.ok(!c.avatar.startsWith('/'), `${c.id} avatar 必須是相對路徑`);
      assert.ok(existsSync(new URL(`../${c.avatar}`, import.meta.url)), `${c.id} 找不到 ${c.avatar}`);
    }
  });

  test('i18n.json 涵蓋所有列舉值', () => {
    for (const v of ALIGNMENTS) assert.ok(i18n.alignment[v]);
    for (const v of ELEMENTS) assert.ok(i18n.element[v]);
    for (const v of BONDS) assert.ok(i18n.bond[v]);
  });
});
