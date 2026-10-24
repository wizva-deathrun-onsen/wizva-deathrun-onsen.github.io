# 開發說明

> 維護者用的內部文件。對外說明請見根目錄 README.md。

純 HTML + CSS + Vanilla JS（ES Modules），無 dependency、無 build step。

```sh
npm run serve   # 等同 python3 -m http.server 8000，開 http://localhost:8000
npm test        # node:test 單元測試（Node 22+）
```

> 直接用 `file://` 開 `index.html` 會因為 fetch JSON 被瀏覽器擋下，請用本機 server。

## 檔案結構

| 路徑 | 說明 |
| --- | --- |
| `index.html` | 頁面骨架 |
| `css/style.css` | 樣式（含深色模式、手機卡片排版） |
| `js/app.js` | 進入點、render |
| `js/filters.js` | 純函式：篩選／排序／搜尋／URL query |
| `js/i18n.js` | 語言偏好、UI 字串載入 |
| `js/theme.js` | 淺色／深色切換（初次套用在 `index.html` 的 inline script，兩邊 storage key 需一致） |
| `js/config.js` | repo 網址等常數（唯一定義處） |
| `data/characters.json` | 角色資料 |
| `data/i18n.json` | UI 字串、性格／屬性／緣份／稀有度名稱 |
| `assets/avatars/` | 頭像 |
| `tests/*.test.js` | 單元測試 |

## 資料格式（`data/characters.json`）

```json
{
  "id": "daniel",
  "no": 2016,
  "name": { "zh": "丹尼爾", "ja": "ダニエル" },
  "avatar": "assets/avatars/daniel.webp",
  "alignment": "good",
  "element": "earth",
  "rarity": "named",
  "dialogue": { "option": 2, "answer": { "zh": "得到上帝寬恕", "ja": null } },
  "bond": "str",
  "contributor": "",
  "verified": true
}
```

| 欄位 | 值 |
| --- | --- |
| `name.zh` / `name.ja` | 以 leveling-guide 的繁中／日文譯名為準 |
| `id` | 與 leveling-guide 的角色 key 相同（特殊造型去掉 `-數字` 後綴），頭像檔名也用它 |
| `no` | 遊戲內角色編號；特殊造型與原版共用同一個編號 |
| `alignment` | `good` / `neutral` / `evil` / `null` |
| `element` | `light` / `dark` / `water` / `fire` / `wind` / `earth` / `none` / `null` |
| `rarity` | `nameless` / `named` / `legendary` / `null` |
| `dialogue.option` | `1` / `2` / `3` / `null` |
| `bond` | `str` 力 / `int` 智 / `agi` 敏 / `fai` 信 / `luk` 命 / `spi` 靈 / `null` |
| `verified` | `false` 時顯示「待確認」標記 |

- 同一角色的特殊造型只收一筆，頭像使用原始造型
- 未知欄位一律填 `null`，頁面顯示「?」或「—」
- `avatar` 為相對路徑；沒有頭像時填 `null`，頁面顯示名稱首字
- `contributor` 多人用逗號或頓號分隔
- `id` 為 kebab-case 且不可重複（測試會檢查）

## 部署與快取

GitHub Pages 會讓瀏覽器快取檔案約 10 分鐘。如果新版 `index.html` 搭配到舊版 JS，頁面可能會壞掉，所以每次改動 JS 或 CSS 後，push 前都要執行：

```sh
npm run bump   # 更新 index.html 裡 CSS 與 import map 的 ?v= 版本號
npm test       # 會檢查版本號是否一致、import map 是否涵蓋 js/ 下所有檔案
```

- 新增 `js/` 檔案時，要把它加進 `index.html` 的 import map
- `data/*.json` 用 `cache: 'no-cache'` 讀取，只改資料時不需要 bump

## 處理社群回報

1. 在 Issue 確認內容（有截圖優先採信）
2. 更新 `data/characters.json`，把回報者的 GitHub 帳號填進 `contributor`
3. 執行 `npm test` 確認資料格式正確
4. commit 訊息附上 `Closes #<issue 編號>`，push 後 Issue 會自動關閉

## 資料來源

- 送死流對話與緣份：巴哈姆特〈[【心得】NPC結緣數值 & 送死流泉水對話選項 分享](https://forum.gamer.com.tw/C.php?bsn=70180&snA=3090)〉及留言補充
- 角色名稱（繁中／日文）、編號、屬性、性格、稀有度與頭像：[leveling-guide](https://leveling-guide-staging.web.app/zh-Hant/wizva/character/)
  - 該站 robots.txt 禁止自動存取，不要寫爬蟲抓取
  - 更新方式：在瀏覽器開啟冒險者頁面（繁中、日文各一次），於 Console 執行收集用的 snippet 並捲到底，把匯出的 JSON 交給 Claude 合併
