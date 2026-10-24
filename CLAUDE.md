# Agent 指引

這是《辟邪除妖 Variants Daphne》送死流泡泉水對話紀錄的靜態網站（GitHub Pages）。詳細規格、資料格式與部署流程見 `.github/DEVELOPMENT.md`。

## 更新社群回報

只處理標了 `已確認` label、且沒有 `資料不完整` 的 open Issue；`待審核` 的還沒經過人工確認，不要套用。維護者在 Issue 留言「ok」時，workflow 會自動換上 `已確認`。

列出可套用的回報（公開 repo，不需要 token）：

```sh
curl -s "https://api.github.com/repos/wizva-deathrun-onsen/wizva-deathrun-onsen.github.io/issues?state=open&labels=%E5%B7%B2%E7%A2%BA%E8%AA%8D&per_page=100"
```

每筆回報：

1. 欄位顯示 `_No response_` 代表沒填。必填為性格、屬性、正確選項（可為「不確定」）；缺的時候不要猜，先在 Issue 留言詢問。正確選項是「不確定」且沒有選項文字的回報沒有可更新的內容，留言詢問後再處理
2. 用 Issue 的日文名找到 `data/characters.json` 的角色，核對性格、屬性；不一致時先問維護者
3. 更新 `dialogue.option`、`dialogue.answer`；選項文字是日文就放 `answer.ja`
4. 回報者暱稱（備註欄「回報者」）加進 `contributors`；有明確文字後 `verified` 設為 `true`
5. `npm test` 全部通過後 commit，訊息附上每筆的 `Closes #<編號>`

## 其他慣例

- 改了 `js/` 或 `css/` 或 `index.html` 要先 `npm run bump` 再 commit
- 角色名稱以 leveling-guide 的繁中／日文譯名為準
- 回覆使用繁體中文（台灣用語），技術名詞保留英文
