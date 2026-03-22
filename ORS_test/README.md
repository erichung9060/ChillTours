# ORS vs 現有方案 比較測試

純 Node.js 實作，不依賴 Python，測試結果可直接作為 Next.js 整合的參考。

## 準備

確認 `.env.local` 已設定：
```
ORS_API_KEY=你的key
GOOGLE_MAPS_API_KEY=（選用，有的話會做三方比較）
```

## 執行

```bash
# Distance Matrix：Haversine vs Google vs ORS
node ORS_test/test_distance_matrix.js

# TSP 求解：Greedy vs OR-Tools(Python) vs ORS Vroom
node ORS_test/test_tsp.js

# 地點資料：Google Places vs ORS Geocoding
node ORS_test/test_places.js
```

> `test_tsp.js` 會嘗試連 Python 服務（`http://localhost:8000`），若沒開就跳過，只比較 Greedy vs ORS Vroom。

## 測試項目

| 測試 | 說明 | 需要的 Key |
|------|------|-----------|
| test_distance_matrix.js | 多點行駛時間矩陣 | ORS（+ 選用 Google） |
| test_tsp.js | TSP 路線排序與成本 | ORS（+ 選用 Python 服務） |
| test_places.js | 座標精度、評分、開放時間 | ORS + Google |
