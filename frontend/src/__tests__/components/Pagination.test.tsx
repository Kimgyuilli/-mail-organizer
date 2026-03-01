import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Pagination } from "@/components/Pagination";

describe("Pagination", () => {
  it("renders nothing when totalPages is 1", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when totalPages is less than 1", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={0}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("displays current page and total pages", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    expect(screen.getByText("2 / 5")).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    const prevButton = screen.getByRole("button", { name: /이전/i });
    expect(prevButton).toBeDisabled();
  });

  it("enables previous button when not on first page", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    const prevButton = screen.getByRole("button", { name: /이전/i });
    expect(prevButton).not.toBeDisabled();
  });

  it("disables next button on last page", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    const nextButton = screen.getByRole("button", { name: /다음/i });
    expect(nextButton).toBeDisabled();
  });

  it("enables next button when not on last page", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    const nextButton = screen.getByRole("button", { name: /다음/i });
    expect(nextButton).not.toBeDisabled();
  });

  it("calls onPrev when previous button is clicked", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    const prevButton = screen.getByRole("button", { name: /이전/i });
    fireEvent.click(prevButton);

    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("calls onNext when next button is clicked", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    const nextButton = screen.getByRole("button", { name: /다음/i });
    fireEvent.click(nextButton);

    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
