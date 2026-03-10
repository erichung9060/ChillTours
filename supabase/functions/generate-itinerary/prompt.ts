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
          "opening_hours": { "open": "09:00", "close": "18:00" }
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
          "opening_hours": { "open": "09:00", "close": "18:00" }
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
- 'opening_hours' is optional. Based on general knowledge, include typical open/close hours in HH:MM 24-hour format (e.g. museums 09:00-17:00). Omit for outdoor or 24-hour locations. This is an AI estimate, not real-time data.`;

  if (customPreferences) {
    prompt += isZH
      ? `\n- 使用者客製化偏好：${customPreferences}`
      : `\n- Custom preferences: ${customPreferences}`;
  }

  return prompt;
}
