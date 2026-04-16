# PRD — Moshimo Box MVP

## 1. Product Overview

**Moshimo Box** 是一個用來觀察宏觀經濟、建立投資藍圖的互動式 dashboard。  
它結合結構化宏觀資料視覺化與 agentic chatbot，讓使用者不只看數據，還可以透過對話：

- 查找與解讀宏觀指標
- 比較不同指標或國家
- 要求系統調整 dashboard 畫面配置
- 用自然語言探索不同總經情境

MVP 階段不做 SaaS 化，不做登入與訂閱，先驗證產品核心價值。

## 2. Problem Statement

現有投資資訊工具常見兩個問題：

**第一，資訊很多，但缺乏穩定框架。**  
使用者看到大量新聞、圖表、KOL 解讀，卻不容易形成自己的宏觀判讀模型。

**第二，dashboard 通常是被動工具。**  
使用者只能自己找圖、切指標、調整版面，無法直接用自然語言讓系統協助研究與重組資訊。

Moshimo Box 要解決的是：

- 幫使用者建立一個清楚的宏觀觀測框架
- 讓 dashboard 從靜態展示板，變成可對話、可調整、可探索的研究工作台

## 3. Target User

### Primary user

對總經、投資配置、資產輪動有興趣的個人研究者或主動投資者。

### Early adopter profile

- 會看總經新聞與市場資料
- 想用更系統化方式建立投資框架
- 願意用 dashboard 與 AI 工具輔助研究
- 不一定是專業投資人，但有中高度研究意願

### Not the target for MVP

- 純短線交易者
- 完全不看總經的人
- 需要券商下單整合的人
- 需要團隊協作、權限管理、報告匯出的企業客戶

## 4. Product Goals

### MVP goals

- 提供一個能快速理解宏觀狀態的 dashboard
- 讓使用者可透過 chat 查找與解釋數據
- 讓使用者可透過 chat 調整 dashboard UI
- 驗證這種 agentic interaction 是否有明顯價值

### Non-goals

- 不做交易執行
- 不做投資建議自動化
- 不做完整 SaaS 帳號系統
- 不做多人協作
- 不做太多資料源整合，先以免費官方資料源為主

## 5. Core Product Principles

1. **Dashboard 是建立世界模型的工具，不是直接買賣訊號機器**
2. **每個前端可見數據都應有對應後端 API**
3. **Agent 不能直接亂改 UI，只能透過受控 action 修改 layout**
4. **先驗證價值，再考慮 SaaS 化**
5. **以少量核心指標與清楚結構優先，而不是資料越多越好**

## 6. User Stories

### Data exploration

- 作為使用者，我想快速看到 growth、inflation、policy、market 四大區塊的核心狀態
- 作為使用者，我想點開某個指標看它的歷史走勢與近期變化
- 作為使用者，我想查某個指標的定義與意義

### Chat-based research

- 作為使用者，我想直接問「最近美國通膨是上行還下行」
- 作為使用者，我想問「幫我找出跟流動性最相關的指標」
- 作為使用者，我想問「比較美國和歐元區最近的成長動能」

### Chat-based UI manipulation

- 作為使用者，我想說「把失業率卡片移到 Growth 區塊最上面」
- 作為使用者，我想說「新增一張 10Y-2Y yield curve 圖」
- 作為使用者，我想說「幫我把版面改成比較適合看 recession risk 的 layout」

## 7. MVP Scope

### In scope

#### A. Dashboard

- 單一主 dashboard
- 四大區塊：
  - Growth
  - Inflation
  - Policy / Liquidity
  - Market
- 每區 2–4 個核心 widget
- widget 類型先限定為：
  - metric card
  - line chart
  - comparison chart

#### B. Data

- 免費資料源優先
- 第一版以：
  - FRED
  - World Bank
為主
- 後端統一正規化資料格式

#### C. Chatbot

- 使用 OpenAI Agents SDK
- 支援：
  - 查詢指標
  - 解釋數據
  - 比較資料
  - 提出 UI 調整建議
  - 執行受控 UI action

#### D. Layout system

- dashboard 版面由 layout schema 驅動
- chat 可以修改 schema
- UI 修改應可預覽或直接套用

### Out of scope

- 使用者登入
- 訂閱制
- 多 dashboard 管理
- 社群功能
- 行動版完整優化
- 報表匯出
- 投資組合追蹤
- 券商串接

## 8. Functional Requirements

### 8.1 Dashboard rendering

系統應能根據 layout schema 渲染 dashboard 頁面。  
每個 widget 應透過對應後端 API 取得資料。

### 8.2 Widget data API

每個 widget 必須對應一個明確 API endpoint，回傳：
- indicator metadata
- current value
- previous value
- change
- observation date
- release date
- source
- trend/status metadata

### 8.3 Indicator search

系統應支援搜尋可用指標，至少可依：
- 名稱
- 類別
- 國家
- 資料源

### 8.4 Time series retrieval

系統應能取得單一指標的時間序列資料，支援：
- date range
- frequency
- optional transformations

### 8.5 Chat research tools

agent 應可呼叫後端工具完成：
- 搜尋指標
- 讀取某個 widget 資料
- 取得時間序列
- 比較兩個以上系列

### 8.6 Chat UI tools

agent 應可透過受控 action：
- 新增 widget
- 移動 widget
- 修改 widget config
- 刪除 widget

### 8.7 Action safety

所有 UI 修改 action 應經過後端驗證，不允許 agent 直接操作前端狀態。

## 9. Non-functional Requirements

- 頁面載入應足夠快，主要 dashboard 初始體驗流暢
- API 回應格式應穩定、一致、可擴充
- agent action 必須可記錄
- layout 變更需可回溯
- 資料來源應標示清楚
- 系統需能處理不同頻率的總經資料

## 10. UX Requirements

### Dashboard UX

- 首頁一眼看出目前宏觀狀態
- 不做資訊爆炸式堆疊
- 每個 widget 應有一句簡短語義說明

### Chat UX

- chat 不只是回答文字，也可產生結構化 action proposal
- 若涉及 UI 修改，應可顯示：
  - 建議內容
  - 影響的 widget
  - 套用操作

### Interaction principle

- 使用者應感覺自己在跟「研究 copilot」互動，而不是一般客服聊天機器人

## 11. Success Metrics

### Product validation metrics

- 使用者是否會主動用 chat 查資料，而不只是看 dashboard
- 使用者是否會用 chat 調整版面
- 使用者是否認為 chat interaction 提升研究效率
- 使用者是否能用 dashboard 更快形成宏觀判讀

### Behavioral metrics

- 每次 session 的 chat 次數
- 每次 session 的 widget interaction 次數
- 被執行的 UI actions 數量
- 常見查詢類型
- 常見 layout 變更類型

### Qualitative validation

- 使用者是否說「這比單純看新聞更有框架」
- 使用者是否說「chat 幫我更快找到我要的資訊」
- 使用者是否願意持續用它來做投資規劃

## 12. Risks

### Product risks

- dashboard 價值不夠明顯，使用者只把它當一般圖表站
- chat 調 UI 看起來炫，但實際不常用
- 總經資料更新頻率較低，使用者期待落差大

### Technical risks

- agent 上下文管理變複雜
- tool call 設計不當，造成 UI 操作不穩
- 多資料源格式正規化花太多時間

### UX risks

- chat 能力太自由，讓使用者不知道能做什麼
- dashboard 與 chat 的角色分工不清楚

## 13. Open Questions

這些是我們接下來最值得一起定義的部分：

1. MVP 第一版到底要放哪些核心指標
2. chat 的 UI 修改是「直接套用」還是「先提案再確認」
3. layout schema 要做到多自由
4. 資料更新頻率怎麼設計
5. chat 的 persona 要偏分析師、研究助理，還是偏 copilot
6. 是否要做簡單的 regime summary layer
7. 要不要在首頁直接有「目前宏觀狀態摘要」

## 14. Suggested Next Step

我建議我們接下來照這個順序往下收斂：

**第一步：定 MVP 指標清單**  
**第二步：定 dashboard 首頁資訊架構**  
**第三步：定 agent tools 與 chat 能做的事**  
**第四步：定 API contract**  
**第五步：再補技術架構與 implementation plan**
