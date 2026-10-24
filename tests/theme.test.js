import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resolveTheme, toggleTheme, THEME_STORAGE_KEY } from '../js/theme.js';

describe('resolveTheme', () => {
  test('使用者選過時優先採用', () => {
    assert.equal(resolveTheme('light', true), 'light');
    assert.equal(resolveTheme('dark', false), 'dark');
  });
  test('未選過或值不合法時跟隨系統', () => {
    assert.equal(resolveTheme(null, true), 'dark');
    assert.equal(resolveTheme(null, false), 'light');
    assert.equal(resolveTheme('sepia', true), 'dark');
  });
});

describe('toggleTheme', () => {
  test('淺深互換，未知值切到深色', () => {
    assert.equal(toggleTheme('dark'), 'light');
    assert.equal(toggleTheme('light'), 'dark');
    assert.equal(toggleTheme(undefined), 'dark');
  });
});

test('index.html 的 inline script 使用相同的 storage key', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes(`'${THEME_STORAGE_KEY}'`));
});

describe('index.html 快取版本號', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const versions = [...html.matchAll(/\?v=([\w.-]+)/g)].map((m) => m[1]);

  test('CSS 與 import map 使用同一個版本號', () => {
    assert.ok(versions.length > 0);
    assert.equal(new Set(versions).size, 1, `版本號不一致：${versions.join(', ')}`);
  });

  test('import map 涵蓋 js/ 下所有 module', async () => {
    const { readdirSync } = await import('node:fs');
    const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
    for (const f of readdirSync(new URL('../js/', import.meta.url)).filter((n) => n.endsWith('.js'))) {
      assert.ok(map[`./js/${f}`], `import map 缺少 ./js/${f}`);
    }
  });
});
