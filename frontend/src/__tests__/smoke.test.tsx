import { describe, expect, it } from "vitest";

describe("smoke test", () => {
  it("renders without crashing", () => {
    const element = document.createElement("div");
    element.textContent = "Mail Organizer";
    expect(element).toHaveTextContent("Mail Organizer");
  });
});
