export function buildItineraryPrompt(
    destination: string,
    startDate: string,
    endDate: string,
    customRequirements?: string,
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
          "description": "詳細描述",
          "location": {
            "name": "地點名稱",
            "lat": 0.0,
            "lng": 0.0
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
- 為每個地點提供準確的 GPS 座標 (lat, lng)
- duration_minutes 必須介於 60 到 240 分鐘之間
- 每天內的活動必須依照時間先後順序排列
- 所有輸出的內容（如 title, description, location name）請使用繁體中文`
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
          "description": "Detailed description",
          "location": {
            "name": "Location name",
            "lat": 0.0,
            "lng": 0.0
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
- Provide accurate GPS coordinates for each location
- duration_minutes should be between 60 and 240
- Activities must be in chronological order within each day`;

    if (customRequirements) {
        prompt += isZH
            ? `\n- 使用者客製化需求：${customRequirements}`
            : `\n- Custom requirements: ${customRequirements}`;
    }

    return prompt;
}
