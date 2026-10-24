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
| `js/config.js` | repo 網址等常數（唯一定義處） |
| `data/characters.json` | 角色資料 |
| `data/i18n.json` | UI 字串、性格／屬性／緣份／稀有度名稱 |
| `assets/avatars/` | 頭像 |
| `tests/filters.test.js` | 單元測試 |

## 資料格式（`data/characters.json`）

```json
{
  "id": "daniel",
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
| `alignment` | `good` / `neutral` / `evil` / `null` |
| `element` | `light` / `dark` / `water` / `fire` / `wind` / `earth` / `none` / `null` |
| `rarity` | `nameless` / `named` / `legendary` / `null` |
| `dialogue.option` | `1` / `2` / `3` / `null` |
| `bond` | `str` 力 / `int` 智 / `agi` 敏 / `fai` 信 / `luk` 命 / `spi` 靈 / `null` |
| `verified` | `false` 時顯示「待確認」標記 |

- 未知欄位一律填 `null`，頁面顯示「?」或「—」
- `avatar` 為相對路徑；沒有頭像時填 `null`，頁面顯示名稱首字
- `contributor` 多人用逗號或頓號分隔
- `id` 為 kebab-case 且不可重複（測試會檢查）

## 處理社群回報

1. 在 Issue 確認內容（有截圖優先採信）
2. 更新 `data/characters.json`，把回報者的 GitHub 帳號填進 `contributor`
3. 執行 `npm test` 確認資料格式正確
4. commit 訊息附上 `Closes #<issue 編號>`，push 後 Issue 會自動關閉
