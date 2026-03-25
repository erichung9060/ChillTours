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
            "name": "地點名稱"
          },
          "duration_minutes": 120
        }
      ]
    }
  ]
}

要求：
- 需要產生完整的 ${duration} 天行程，編號從 1 到 ${duration}
- 每天應該要有 3-5 個活動
- 使用 24 小時制的 HH:MM 時間格式
- duration_minutes 必須介於 60 到 240 分鐘之間
- 每天內的活動必須依照時間先後順序排列
- note 欄位為選填，如果沒有特別要注意的事項可以不必填寫
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
            "name": "Location name"
          },
          "duration_minutes": 120
        }
      ]
    }
  ]
}

Requirements:
- Generate exactly ${duration} days, numbered 1 to ${duration}
- Each day should have 3-5 activities
- Use 24-hour HH:MM time format
- duration_minutes should be between 60 and 240
- Activities must be in chronological order within each day
- 'note' is optional, leave it empty if there are no special tips or reminders`;

  if (customPreferences) {
    prompt += isZH
      ? `\n- 使用者客製化偏好：${customPreferences}`
      : `\n- Custom preferences: ${customPreferences}`;
  }

  return prompt;
}
