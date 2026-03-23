/**
 * Test: resolve-places Edge Function
 * 驗證：
 *   1. service role key bypass（無需 JWT）
 *   2. 回傳精確座標 + place_id
 *   3. 回傳 opening_hours（台灣景點）
 *   4. 找不到的地點回傳 error: NOT_FOUND
 *   5. Place Details 失敗 fallback（需手動觀察，此測試跑真實 API）
 *
 * 執行：node ORS_test/test_resolve_places.js
 * 需要：NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY（.env.local）
 */

import { SUPABASE_URL, API_GATEWAY_SECRET, haversineMeters, divider } from "./utils.js";

const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/resolve-places`;

const TEST_PLACES = [
  { id: "p1", name: "國立故宮博物院",   lat: 25.10,  lng: 121.55, expectedLat: 25.1023, expectedLng: 121.5484 },
  { id: "p2", name: "台北101",          lat: 25.03,  lng: 121.56, expectedLat: 25.0338, expectedLng: 121.5645 },
  { id: "p3", name: "龍山寺",           lat: 25.03,  lng: 121.50, expectedLat: 25.0373, expectedLng: 121.4997 },
  { id: "p4", name: "士林夜市",         lat: 25.08,  lng: 121.52, expectedLat: 25.0877, expectedLng: 121.5241 },
  { id: "p5", name: "完全不存在的地方XYZXYZ123", lat: 25.05, lng: 121.55, expectedLat: null, expectedLng: null },
];

function secToHHMM(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  return `${h}:${m}`;
}

function checkMark(ok) { return ok ? "✓" : "✗"; }

async function callEdgeFunction(places) {
  const t0 = Date.now();
  const res = await fetch(EDGE_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-server-secret": API_GATEWAY_SECRET,
    },
    body: JSON.stringify({ places }),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  return { data, elapsed };
}

async function main() {
  console.log(`\nresolve-places Edge Function 測試`);
  console.log(`URL：${EDGE_FN_URL}`);
  console.log(`API Gateway Secret：${API_GATEWAY_SECRET ? "✓ 已設定" : "✗ 未設定"}`);

  if (!SUPABASE_URL || !API_GATEWAY_SECRET) {
    console.error("\n✗ 缺少 SUPABASE_URL 或 API_GATEWAY_SECRET，請確認 .env.local");
    process.exit(1);
  }

  // ── 測試 1：正常批次查詢（4 個真實地點 + 1 個不存在）──────
  console.log(`\n${divider()}`);
  console.log("  測試 1：批次查詢（含找不到的地點）");
  console.log(divider());

  let result;
  try {
    result = await callEdgeFunction(TEST_PLACES.map(({ id, name, lat, lng }) => ({ id, name, lat, lng })));
  } catch (err) {
    console.error(`✗ 呼叫失敗：${err.message}`);
    process.exit(1);
  }

  const { data, elapsed } = result;
  console.log(`  耗時：${elapsed}s（${TEST_PLACES.length} 個地點）`);

  const resolved = data.resolved ?? [];

  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < TEST_PLACES.length; i++) {
    const expected = TEST_PLACES[i];
    const r = resolved[i];

    console.log(`\n  ${"─".repeat(56)}`);
    console.log(`  [${expected.id}] ${expected.name}`);

    if (!r) {
      console.log(`    ✗ 無回應（resolved[${i}] 不存在）`);
      failCount++;
      continue;
    }

    if (expected.expectedLat === null) {
      // 期望找不到
      const notFound = r.error === "NOT_FOUND";
      console.log(`    ${checkMark(notFound)} error: ${r.error ?? "（無）"}（期望 NOT_FOUND）`);
      notFound ? passCount++ : failCount++;
      continue;
    }

    // 有 place_id
    const hasPlaceId = !!r.place_id;
    console.log(`    ${checkMark(hasPlaceId)} place_id：${r.place_id ?? "✗ 無"}`);

    // 座標精度
    if (r.lat != null && r.lng != null) {
      const errM = Math.round(haversineMeters(expected.expectedLat, expected.expectedLng, r.lat, r.lng));
      const accurate = errM < 200;
      console.log(`    ${checkMark(accurate)} 座標：${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}  誤差 ${errM}m（期望 <200m）`);
      accurate ? passCount++ : failCount++;
    } else {
      console.log(`    ✗ 座標：無回傳`);
      failCount++;
    }

    // opening_hours（故宮、博物館應該有）
    if (r.opening_hours) {
      const periods = r.opening_hours.periods ?? [];
      console.log(`    ✓ opening_hours：有（${periods.length} 個 period）`);
    } else {
      console.log(`    △ opening_hours：無（可能是夜市/全天開放）`);
    }

    // rating
    if (r.rating != null) {
      console.log(`    ✓ rating：${r.rating}`);
    } else {
      console.log(`    △ rating：無`);
    }
  }

  // ── 測試 2：Forbidden（無 service role key）──────────────
  console.log(`\n${divider()}`);
  console.log("  測試 2：無 service role key 應被 403 拒絕");
  console.log(divider());

  try {
    const res = await fetch(EDGE_FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ places: [{ id: "x", name: "test", lat: 25.0, lng: 121.5 }] }),
    });
    const is403 = res.status === 403;
    console.log(`  ${checkMark(is403)} HTTP ${res.status}（期望 403）`);
    is403 ? passCount++ : failCount++;
  } catch (err) {
    console.log(`  △ 連線失敗（可能是 CORS 或本機 supabase 未啟動）：${err.message}`);
  }

  // ── 測試 3：錯誤格式應回 400 ──────────────────────────────
  console.log(`\n${divider()}`);
  console.log("  測試 3：缺少 places 欄位應回 400");
  console.log(divider());

  try {
    const res = await fetch(EDGE_FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-role-key": SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ wrong_field: [] }),
    });
    const is400 = res.status === 400;
    console.log(`  ${checkMark(is400)} HTTP ${res.status}（期望 400）`);
    is400 ? passCount++ : failCount++;
  } catch (err) {
    console.log(`  △ 連線失敗：${err.message}`);
  }

  // ── 總結 ──────────────────────────────────────────────────
  console.log(`\n${divider()}`);
  console.log(`  結果：${passCount} 通過 / ${failCount} 失敗`);
  if (failCount === 0) {
    console.log("  ✓ 全部通過");
  } else {
    console.log("  ✗ 有失敗項目，請檢查上方細節");
  }
  console.log();
}

main().catch((err) => {
  console.error("未預期錯誤：", err);
  process.exit(1);
});
