# WizVA 送死流對話選項紀錄 / WizVA Death-Run Onsen Dialogue Guide

《辟邪除妖 Variants Daphne》（ウィザードリィ ヴァリアンツ ダフネ）送死流泡泉水的固定對話正確選項，以及遣散有緣人後的緣份整理。

網站：https://yf24.github.io/wizva-deathrun-onsen/

## 什麼是送死流

隊伍在冒險中有成員陣亡後去泡泉水，會觸發該角色特殊且固定的對話（與一般泉水的隨機對話不同）。選對選項會增加好感度，且同性格的隊員會一起增加；好感度滿即可結緣，遣散有緣人後獲得對應的能力加成（力／智／敏／信／命／靈）。

## 功能

- 依性格、屬性、緣份多選篩選，名稱／選項內容關鍵字搜尋，多種排序
- 角色名稱與對話可切換中文／日文（偏好存在 localStorage）
- 篩選狀態同步到網址，例如 `?align=good,evil&elem=fire&lang=ja`，可直接分享
- 手機版自動改為卡片排版；支援深色模式
- 每一列都有「回報」連結，透過 GitHub Issue Form 回報資料

## 回報資料

點網站上的「回報新角色／修正資料」，或直接開 [Issue 範本](https://github.com/yf24/wizva-deathrun-onsen/issues/new?template=dialogue-report.yml)。
維護者審核後會手動更新 `data/characters.json`，並把回報者填進 `contributor`。

## 開發

純 HTML + CSS + Vanilla JS（ES Modules），無 dependency、無 build step。

```sh
npm run serve   # 等同 python3 -m http.server 8000，開 http://localhost:8000
npm test        # node:test 單元測試（Node 22+）
```

> 直接用 `file://` 開 `index.html` 會因為 fetch JSON 被瀏覽器擋下，請用本機 server。

### 檔案結構

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

### 資料格式（`data/characters.json`）

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

## 資料來源

- 巴哈姆特〈[【心得】NPC結緣數值 & 送死流泉水對話選項 分享](https://forum.gamer.com.tw/C.php?bsn=70180&snA=3090)〉及留言補充
- 角色名稱與頭像對照：[leveling-guide](https://leveling-guide-staging.web.app/zh-Hans/wizva/character/)（人工整理，未自動爬取）

遊戲內容與頭像素材版權歸原廠及相關權利人所有，本站為非官方玩家整理。
