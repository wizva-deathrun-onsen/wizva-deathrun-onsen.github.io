/**
 * 更新 index.html 中的快取版本號（CSS 與 import map 的 ?v=）。
 * 每次部署前執行：npm run bump
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../index.html', import.meta.url);
const html = readFileSync(file, 'utf8');
// 版本號用台北時間的 YYYYMMDDHHmm，同一分鐘內重複執行結果相同。
const version = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace(/\D/g, '').slice(0, 12);
const next = html.replace(/\?v=[\w.-]+/g, `?v=${version}`);
if (next === html) {
  console.log(`版本號未變更（${version}）`);
} else {
  writeFileSync(file, next);
  console.log(`版本號更新為 ${version}`);
}
