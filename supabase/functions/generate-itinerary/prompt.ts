export function buildItineraryPrompt(
  destination: string,
  startDate: string,
  endDate: string,
  customPreferences?: string,
  locale?: string
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const isZH = locale === "zh-TW";

  let prompt = isZH
    ? `你是一個旅遊規劃助手。請為 ${destination} 產生一份詳細的 ${duration} 天旅遊行程，時間從 ${startDate} 到 ${endDate}。

請「只能」回覆符合以下結構的合法 JSON 格式，不要包含 Markdown 語法，也不要有任何其他文字：

{
  "itinerary": [
    {
      "day_number": 1,
      "activities": [
        {
          "time": "HH:MM",
          "title": "活動名稱",
          "note": "貼心的實用提醒 (e.g., 必吃美食、避開人潮時間)",
          "location": {
            "name": "地點名稱",
            "lat": 0.0,
            "lng": 0.0
          },
          "duration_minutes": 120,
          "opening_hours": { "open": "09:00", "close": "18:00" },
          "type": "lunch",
          "flexible": true
        }
      ]
    }
  ]
}

要求：
- 需要產生完整的 ${duration} 天行程，編號從 1 到 ${duration}
- 每天應該要有 3-5 個活動
- 使用 24 小時制的 HH:MM 時間格式
- 為每個地點提供準確的 GPS 座標 (lat, lng)
- duration_minutes 必須介於 60 到 240 分鐘之間
- 每天內的活動必須依照時間先後順序排列
- note 欄位為選填，如果沒有特別要注意的事項可以不必填寫
- opening_hours 為選填。根據通識知識填入最常見的開放時段（HH:MM 24 小時制），例如博物館通常 09:00-17:00。戶外景點或全天開放地點可省略。此為 AI 估計值，非即時資料
- 除非使用者明確指定要去某間餐廳（例如「我想吃鼎泰豐」「一定要吃牛肉麵」），否則不要生成任何 type 為 lunch、dinner 或 breakfast 的活動。系統會在路線確定後自動根據位置推薦餐廳
- 若使用者有指定餐廳，照常生成該餐廳活動，並設 "flexible": false
- 早餐（"type": "breakfast"）只在使用者明確要求特定早餐地點時才加入
- 一般景點活動請省略 type 欄位（不要輸出 type）
- 禁止輸出 "type": "transit"
- flexible 欄位：有固定時間的活動（票券、演出、已預約導覽）設為 false，其餘（景點、購物、博物館、餐廳）設為 true。如果不確定，省略此欄位
- importance 欄位：根據使用者偏好設定，使用者明確指定必去設為 "must"，有提到偏好（例如「想爬山」「喜歡夜市」）設為 "preferred"，其餘省略此欄位
- 所有輸出的內容（如 title, note, location name）請使用繁體中文`
    : `You are a travel planning assistant. Generate a detailed ${duration}-day travel itinerary for ${destination} from ${startDate} to ${endDate}.

Respond ONLY with a valid JSON object in this exact structure, no markdown, no extra text:

{
  "itinerary": [
    {
      "day_number": 1,
      "activities": [
        {
          "time": "HH:MM",
          "title": "Activity name",
          "note": "Helpful tips (e.g., must-try foods, best time to visit)",
          "location": {
            "name": "Location name",
            "lat": 0.0,
            "lng": 0.0
          },
          "duration_minutes": 120,
          "opening_hours": { "open": "09:00", "close": "18:00" },
          "type": "lunch",
          "flexible": true
        }
      ]
    }
  ]
}

Requirements:
- Generate exactly ${duration} days, numbered 1 to ${duration}
- Each day should have 3-5 activities
- Use 24-hour HH:MM time format
- Provide accurate GPS coordinates for each location
- duration_minutes should be between 60 and 240
- Activities must be in chronological order within each day
- 'note' is optional, leave it empty if there are no special tips or reminders
- 'opening_hours' is optional. Based on general knowledge, include typical open/close hours in HH:MM 24-hour format (e.g. museums 09:00-17:00). Omit for outdoor or 24-hour locations. This is an AI estimate, not real-time data.
- Do NOT generate any lunch, dinner, or breakfast activities unless the user explicitly names a specific restaurant they want to visit (e.g. "I want to eat at Din Tai Fung", "must have beef noodles"). The system will recommend nearby restaurants after the route is finalized
- If the user specifies a restaurant, generate it normally and set "flexible": false
- Breakfast ("type": "breakfast") should only be added when the user explicitly requests a specific breakfast spot
- Regular sightseeing activities must omit the type field entirely (do not output type)
- Never output "type": "transit"
- flexible field: set to false for activities with fixed times (tickets, shows, pre-booked tours), true for everything else (sightseeing, shopping, museums, restaurants). Omit if unsure
- importance field: set to "must" for locations the user explicitly said they must visit, "preferred" for locations matching user preferences (e.g. "I like hiking", "love night markets"), omit for all other activities` ;

  if (customPreferences) {
    prompt += isZH
      ? `\n- 使用者客製化偏好：${customPreferences}`
      : `\n- Custom preferences: ${customPreferences}`;
  }

  return prompt;
}
