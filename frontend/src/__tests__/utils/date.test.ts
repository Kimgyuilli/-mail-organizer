import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatDate } from "@/utils/date";

describe("formatDate", () => {
  beforeEach(() => {
    // Mock the current date to 2026-03-01 12:00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty string when dateStr is null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns time format for today's date", () => {
    const todayDate = "2026-03-01T10:00:00Z";
    const result = formatDate(todayDate);

    // Should include time format (hours:minutes)
    expect(result).toMatch(/\d+:\d+/);
  });

  it("returns date format for past dates", () => {
    const pastDate = "2026-02-28T10:00:00Z";
    const result = formatDate(pastDate);

    // Should include month and day
    expect(result).toBeTruthy();
    expect(result).not.toMatch(/\d+:\d+/); // Should not be time format
  });

  it("handles different timezones correctly", () => {
    const dateStr = "2026-03-01T05:30:00Z";
    const result = formatDate(dateStr);

    // Should recognize as today (same calendar day)
    expect(result).toMatch(/\d+:\d+/);
  });

  it("formats old date correctly", () => {
    const oldDate = "2026-01-15T10:00:00Z";
    const result = formatDate(oldDate);

    // Should be in date format, not time format
    expect(result).toBeTruthy();
    expect(result).not.toMatch(/\d+:\d+/);
  });
});
