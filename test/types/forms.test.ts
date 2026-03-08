import { describe, it, expect } from "vitest";
import {
  createTripFormSchema,
  createEditMetadataFormSchema,
  createActivityFormSchema,
} from "@/types/forms";

describe("Form Schema Factories", () => {
  const mockT = (key: string) => `translated-${key}`;

  describe("createTripFormSchema", () => {
    it("should return translated error for missing destination", () => {
      const schema = createTripFormSchema(mockT);
      const result = schema.safeParse({
        destination: "",
        dates: { from: new Date(), to: new Date() },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "translated-validation.destinationRequired"
        );
      }
    });

    it("should return translated error for missing start date", () => {
      const schema = createTripFormSchema(mockT);
      const result = schema.safeParse({
        destination: "Tokyo",
        dates: { from: undefined, to: undefined },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const dateError = result.error.issues.find((issue) =>
          issue.path.includes("from")
        );
        expect(dateError?.message).toBe(
          "translated-validation.startDateRequired"
        );
      }
    });

    it("should return translated error when end date is before start date", () => {
      const schema = createTripFormSchema(mockT);
      const start = new Date("2026-05-01");
      const end = new Date("2026-04-01");

      const result = schema.safeParse({
        destination: "Tokyo",
        dates: { from: start, to: end },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "translated-validation.endDateAfterStart"
        );
      }
    });
  });

  describe("createActivityFormSchema", () => {
    it("should return translated error for invalid time format", () => {
      const schema = createActivityFormSchema(mockT);
      const result = schema.safeParse({
        title: "Activity",
        locationName: "Tokyo Tower",
        time: "25:99",
        duration: 60,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const timeError = result.error.issues.find((issue) =>
          issue.path.includes("time")
        );
        expect(timeError?.message).toBe(
          "translated-validation.timeInvalidFormat"
        );
      }
    });

    it("should return translated error for invalid URL", () => {
      const schema = createActivityFormSchema(mockT);
      const result = schema.safeParse({
        title: "Activity",
        locationName: "Tokyo Tower",
        time: "10:00",
        duration: 60,
        url: "not-a-url",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const urlError = result.error.issues.find((issue) =>
          issue.path.includes("url")
        );
        expect(urlError?.message).toBe("translated-validation.invalidUrl");
      }
    });
  });
});
