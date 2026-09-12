# 專題（Topics）Style Guide

目的只有一個：**讓每一篇專題看起來是同一個網站做的。**
撰寫流程見 [`content/topics/README.md`](../content/topics/README.md)。

## 1. 兩層結構

| 層                                               | 放哪                     | 誰用       | 誰決定外觀            |
| ------------------------------------------------ | ------------------------ | ---------- | --------------------- |
| **共用積木**（每篇都會用到的內容區塊）           | `components/topics/`     | 所有專題   | 這裡改一次，全部同步  |
| **單篇專屬的互動元件**（模擬器、探索器、視覺化） | `content/topics/<slug>/` | 只有那一篇 | 必須套用第 3 節的規則 |

視覺一致性來自「積木共用」＋「專屬元件只用同一套 token」。

## 2. 共用積木：先用現成的，不要自己發明

| 你想表達的                       | 用這個                                | 不要這樣做              |
| -------------------------------- | ------------------------------------- | ----------------------- |
| 值得讀者停下來的一句話           | `<Callout>…</Callout>`                | 自己包 `<div>` 加背景色 |
| 兩種做法／想法的對照（❌ vs ✅） | `<Compare bad={…} good={…} />`        | 手寫兩欄表格            |
| 文末重點清單                     | `<KeyTakeaways items={[…]} />`        | 純 Markdown 清單        |
| 讓讀者自我檢驗的單選題           | `<Quiz question="…" options={[…]} />` | 每篇各寫一個測驗元件    |

用法範例：`content/topics/how-to-learn-a-new-concept/index.mdx`。

**使用節制**：`Callout` 一篇不超過 3–4 個，多了就沒有「停下來」的效果。

### 什麼時候可以新增共用積木

當**第二篇**專題也需要同一種區塊時，把它提升到 `components/topics/`，並在上表補一列。
第一次出現時先放在該篇資料夾裡，不要預先抽象。

## 3. 單篇專屬互動元件的規則

- **只用既有的設計 token 與 UI 元件**：`@/components/ui/*`（`Button`、`Card`、`Badge`…）與 Tailwind 的語意 class（`bg-muted`、`text-muted-foreground`、`border`、`bg-background`）。
- **不寫死顏色**：不出現 `#hex`、`bg-blue-500`、`text-red-600` 這類；需要「好／壞」「高／低」的語意色時，用 `text-foreground` + 粗細／圖示區分，或用 `destructive` token。深色模式與未來改版才不會壞。
- **外層容器固定**：`className="not-prose my-8 rounded-lg border bg-muted/40 p-6"`，讓所有互動區塊在文章裡的份量一致。
- **一定有小標**：`<p className="text-sm font-medium text-muted-foreground">` 說明「這是什麼、要讀者做什麼」。
- **結果區塊加 `aria-live="polite"`**，讓螢幕閱讀器知道數字變了。
- **控制項用原生元素**：`<input type="range">`、`<input type="checkbox">`、`<button>`（或 `Button`），不引入新的 UI 套件。
- **一個元件只講一個道理**。要講兩件事，就拆成兩個元件。
- **每個互動元件都要有測試**：純計算抽成獨立函式單獨測；UI 用 Testing Library 測「操作後畫面怎麼變」。

## 4. 排版與樣式改哪裡

- 專題區的排版、標題間距、程式碼區塊配色：`app/globals.css` 最底下的 `.topic-shell` 區塊。**只改這裡**，不要在單篇裡覆寫。
- 共用積木的外觀：對應的 `components/topics/*.tsx`。
- 專題區需要跟一般文章不同的視覺風格時，也是在 `.topic-shell` scope 內處理，不會外溢到 `/posts`。

## 5. 目前刻意不做的

- 自訂配色主題、動畫、圖表函式庫。現在的專題區是可用的骨架；風格設計是之後的獨立工作，屆時只需改 `.topic-shell` 與共用積木。
- `cover` 欄位已定義但尚未在畫面上渲染。
