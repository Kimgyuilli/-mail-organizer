import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MailListView } from "@/components/MailListView";
import { MailMessage } from "@/types/mail";

describe("MailListView", () => {
  const mockProps = {
    categories: ["업무", "개인", "광고"],
    editingMailId: null,
    currentPage: 1,
    totalPages: 1,
    onEditMail: vi.fn(),
    onEditBlur: vi.fn(),
    onSelectMail: vi.fn(),
    onDragStart: vi.fn(),
    onUpdateCategory: vi.fn(),
    onPrevPage: vi.fn(),
    onNextPage: vi.fn(),
  };

  it("displays loading message when loading is true", () => {
    render(
      <MailListView
        {...mockProps}
        loading={true}
        messages={[]}
        total={0}
        classifiedCount={0}
      />
    );

    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });

  it("displays empty message when messages array is empty", () => {
    render(
      <MailListView
        {...mockProps}
        loading={false}
        messages={[]}
        total={0}
        classifiedCount={0}
      />
    );

    expect(screen.getByText("메일이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText(/"메일 동기화" 버튼을 눌러 Gmail에서 메일을 가져오세요./i)).toBeInTheDocument();
  });

  it("displays total count and classified count when messages exist", () => {
    const sampleMessages: MailMessage[] = [
      {
        id: 1,
        source: "gmail",
        external_id: "ext1",
        from_email: "test@gmail.com",
        from_name: "Test User",
        subject: "Test Mail",
        to_email: null,
        folder: null,
        received_at: "2026-03-01T10:00:00Z",
        is_read: false,
        classification: {
          classification_id: 1,
          category: "업무",
          confidence: 0.9,
          user_feedback: null,
        },
      },
      {
        id: 2,
        source: "naver",
        external_id: "ext2",
        from_email: "test2@naver.com",
        from_name: "Test User 2",
        subject: "Test Mail 2",
        to_email: null,
        folder: null,
        received_at: "2026-03-01T09:00:00Z",
        is_read: true,
        classification: null,
      },
    ];

    render(
      <MailListView
        {...mockProps}
        loading={false}
        messages={sampleMessages}
        total={10}
        classifiedCount={1}
      />
    );

    expect(screen.getByText("총 10개의 메일")).toBeInTheDocument();
    expect(screen.getByText("분류됨: 1/2")).toBeInTheDocument();
  });

  it("renders messages when messages array is not empty", () => {
    const sampleMessages: MailMessage[] = [
      {
        id: 1,
        source: "gmail",
        external_id: "ext1",
        from_email: "test@gmail.com",
        from_name: "Test User",
        subject: "Test Subject",
        to_email: null,
        folder: null,
        received_at: "2026-03-01T10:00:00Z",
        is_read: false,
        classification: {
          classification_id: 1,
          category: "업무",
          confidence: 0.9,
          user_feedback: null,
        },
      },
    ];

    render(
      <MailListView
        {...mockProps}
        loading={false}
        messages={sampleMessages}
        total={1}
        classifiedCount={1}
      />
    );

    // Check that mail content is rendered (subject or sender)
    expect(screen.getByText("Test Subject")).toBeInTheDocument();
  });

  it("does not render pagination when totalPages is 1", () => {
    const sampleMessages: MailMessage[] = [
      {
        id: 1,
        source: "gmail",
        external_id: "ext1",
        from_email: "test@gmail.com",
        from_name: "Test User",
        subject: "Test Mail",
        to_email: null,
        folder: null,
        received_at: "2026-03-01T10:00:00Z",
        is_read: false,
        classification: null,
      },
    ];

    render(
      <MailListView
        {...mockProps}
        loading={false}
        messages={sampleMessages}
        total={1}
        classifiedCount={0}
        totalPages={1}
      />
    );

    expect(screen.queryByRole("button", { name: /이전/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /다음/i })).not.toBeInTheDocument();
  });

  it("renders pagination when totalPages is greater than 1", () => {
    const sampleMessages: MailMessage[] = [
      {
        id: 1,
        source: "gmail",
        external_id: "ext1",
        from_email: "test@gmail.com",
        from_name: "Test User",
        subject: "Test Mail",
        to_email: null,
        folder: null,
        received_at: "2026-03-01T10:00:00Z",
        is_read: false,
        classification: null,
      },
    ];

    render(
      <MailListView
        {...mockProps}
        loading={false}
        messages={sampleMessages}
        total={30}
        classifiedCount={0}
        currentPage={2}
        totalPages={3}
      />
    );

    expect(screen.getByRole("button", { name: /이전/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /다음/i })).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });
});
