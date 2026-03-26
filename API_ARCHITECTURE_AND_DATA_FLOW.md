# API 架構與資料流 (API Architecture and Data Flow)

這份文件詳細記錄了系統的四層次 API 架構及其資料流保護機制。

## 第一層：最外圍的 Cloudflare（流量清洗大門）
*   **定位**：SaaS 的第一道防線，負責過濾無效與惡意流量。
*   **動作**：執行 Rate Limit（請求限流，限制同一個 IP 在 10 秒內最多 20 次請求）與基本 WAF 防護。
*   **結果**：把惡意腳本和 DDoS 攻擊擋在門外，確保 Vercel 不會因為無意義的流量而產生額外計費。

## 第二層：前端與 Vercel 閘道（應用層入口）
*   **定位**：Next.js 部署於 Vercel，負責畫面渲染與請求轉發。
*   **前端地圖渲染**：瀏覽器端直接使用 Google Maps API 渲染地圖，但這把 Key 在 Google Cloud Console 中設定了「嚴格的網域白名單（HTTP Referrers）」，只能在自家網域下使用。
*   **API 請求轉發**：當使用者要求 AI 規劃行程時，Next.js 不直接打外部 API，而是作為一個 Proxy 閘道。它會在 `.env` 中抓取 `API_GATEWAY_SECRET`，附加在請求的 Header 裡，往 Supabase 送出。

## 第三層：Supabase Edge Functions（核心商業與驗證大腦）
*   **定位**：最高安全級別的後端環境，負責防白嫖與處理高成本運算。
*   **雙重來源驗證**：Edge Function 收到請求後，第一步先檢查 Header 有沒有正確的 `API_GATEWAY_SECRET`，確認請求真的是自家 Vercel 發出的，防範別人直接拿 Postman 打資料庫。
*   **身分與額度驗證**：解析 Supabase 的 JWT Token 確認 `user_id`。接著去資料庫比對該使用者的「會員狀態」或「API 呼叫剩餘額度（Quota）」。
*   **阻斷機制**：如果沒登入、沒帶 Secret、或是免費額度用光了，就在這裡直接回傳 Error，絕對不觸發後續的高成本 API。

## 第四層：外部高成本 API（執行器）
*   **定位**：Gemini (AI 規劃)、ORS (路線計算)、Google Maps (後端地理資料)。
*   **私鑰保護**：這些昂貴的 API Keys 全部安全地存放在 Supabase 的環境變數（Edge Function Secrets）中，前端和 Vercel 完全碰不到。
*   **執行與回傳**：第三層的條件全部吻合後，Edge Function 才會帶著這些私鑰去呼叫 Gemini 和 ORS，將規劃好的行程存入資料庫，最後把結果一路回傳給前端渲染。
*   **Google Map API Quota 限制**：每日 600 次，包括 Place API (New) 中的 `searchText` 以及 `getPlace`。
