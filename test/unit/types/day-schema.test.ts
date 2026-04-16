import { describe, it, expect } from "vitest";
import { DaySchema } from "@/types/itinerary";

const baseDay = {
  day_number: 1,
  activities: [],
};

describe("DaySchema - start_time / end_time", () => {
  it("不帶 start_time / end_time 應通過（optional）", () => {
    expect(() => DaySchema.parse(baseDay)).not.toThrow();
  });

  it("合法的 start_time / end_time 應通過", () => {
    expect(() =>
      DaySchema.parse({ ...baseDay, start_time: "08:00", end_time: "21:00" }),
    ).not.toThrow();
  });

  it("邊界值 00:00 / 23:59 應通過", () => {
    expect(() =>
      DaySchema.parse({ ...baseDay, start_time: "00:00", end_time: "23:59" }),
    ).not.toThrow();
  });

  it("缺少前導零的格式（8:00）應通過", () => {
    // regex 允許 [0-1]?[0-9] 開頭，所以 8:00 合法
    expect(() => DaySchema.parse({ ...baseDay, start_time: "8:00" })).not.toThrow();
  });

  it("小時超過 23 應拋錯", () => {
    expect(() => DaySchema.parse({ ...baseDay, start_time: "25:00" })).toThrow();
  });

  it("分鐘超過 59 應拋錯", () => {
    expect(() => DaySchema.parse({ ...baseDay, end_time: "10:60" })).toThrow();
  });

  it("格式錯誤（無冒號）應拋錯", () => {
    expect(() => DaySchema.parse({ ...baseDay, start_time: "0800" })).toThrow();
  });

  it("格式錯誤（文字）應拋錯", () => {
    expect(() => DaySchema.parse({ ...baseDay, start_time: "morning" })).toThrow();
  });

  it("解析後的型別包含 start_time / end_time", () => {
    const result = DaySchema.parse({
      ...baseDay,
      start_time: "09:00",
      end_time: "20:00",
    });
    expect(result.start_time).toBe("09:00");
    expect(result.end_time).toBe("20:00");
  });

  it("只帶 start_time 不帶 end_time 也應通過", () => {
    expect(() => DaySchema.parse({ ...baseDay, start_time: "08:00" })).not.toThrow();
  });
});
