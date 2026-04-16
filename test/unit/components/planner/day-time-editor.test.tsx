import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DayTimeEditor } from "@/components/planner/itinerary/components/day-time-editor";

describe("DayTimeEditor", () => {
  const onSave = vi.fn();
  const onApplyAll = vi.fn();

  beforeEach(() => {
    onSave.mockReset();
    onApplyAll.mockReset();
    onSave.mockResolvedValue(undefined);
    onApplyAll.mockResolvedValue(undefined);
  });

  it("預設顯示 startTime – endTime", () => {
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    expect(screen.getByText("08:00 – 21:00")).toBeInTheDocument();
  });

  it("預設不顯示時間面板", () => {
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    expect(screen.queryByText("儲存")).not.toBeInTheDocument();
  });

  it("點擊後展開時間面板", () => {
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    expect(screen.getByText("儲存")).toBeInTheDocument();
    expect(screen.getByText("套用全部天")).toBeInTheDocument();
  });

  it("面板顯示 Day N 標題", () => {
    render(
      <DayTimeEditor
        dayNumber={3}
        startTime="09:00"
        endTime="20:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("09:00 – 20:00"));
    expect(screen.getByText("Day 3 時間範圍")).toBeInTheDocument();
  });

  it("點擊「儲存」呼叫 onSave 並帶正確參數", async () => {
    render(
      <DayTimeEditor
        dayNumber={2}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    fireEvent.click(screen.getByText("儲存"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
      expect(onSave).toHaveBeenCalledWith(2, "08:00", "21:00");
    });
  });

  it("點擊「套用全部天」呼叫 onApplyAll 並帶正確參數", async () => {
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    fireEvent.click(screen.getByText("套用全部天"));
    await waitFor(() => {
      expect(onApplyAll).toHaveBeenCalledOnce();
      expect(onApplyAll).toHaveBeenCalledWith("08:00", "21:00");
    });
  });

  it("儲存後面板關閉", async () => {
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    fireEvent.click(screen.getByText("儲存"));
    await waitFor(() => {
      expect(screen.queryByText("儲存")).not.toBeInTheDocument();
    });
  });
});
