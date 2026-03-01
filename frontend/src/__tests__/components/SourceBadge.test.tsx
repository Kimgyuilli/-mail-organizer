import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SourceBadge } from "@/components/SourceBadge";

describe("SourceBadge", () => {
  it("displays G for gmail source", () => {
    render(<SourceBadge source="gmail" small={false} />);

    expect(screen.getByText("G")).toBeInTheDocument();
  });

  it("has Gmail title for gmail source", () => {
    render(<SourceBadge source="gmail" small={false} />);

    expect(screen.getByTitle("Gmail")).toBeInTheDocument();
  });

  it("displays N for naver source", () => {
    render(<SourceBadge source="naver" small={false} />);

    expect(screen.getByText("N")).toBeInTheDocument();
  });

  it("has 네이버 title for naver source", () => {
    render(<SourceBadge source="naver" small={false} />);

    expect(screen.getByTitle("네이버")).toBeInTheDocument();
  });

  it("renders in small mode", () => {
    render(<SourceBadge source="gmail" small={true} />);

    expect(screen.getByText("G")).toBeInTheDocument();
  });
});
