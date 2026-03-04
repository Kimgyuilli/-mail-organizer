"use client";

import { useState } from "react";
import { useCalendar } from "@/hooks/useCalendar";
import { CalendarMonthView } from "@/components/CalendarMonthView";
import { CalendarEventDetail } from "@/components/CalendarEventDetail";
import { CalendarSidebar } from "@/components/CalendarSidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarEvent } from "@/types/calendar";

interface CalendarViewProps {
  userId: number | null;
}

export function CalendarView({ userId }: CalendarViewProps) {
  const {
    calendars,
    events,
    selectedCalendarIds,
    loading,
    currentDate,
    toggleCalendar,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
  } = useCalendar({ userId, enabled: true });

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  if (loading && events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex">
      {/* Calendar sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r overflow-auto">
        <CalendarSidebar
          calendars={calendars}
          selectedCalendarIds={selectedCalendarIds}
          currentDate={currentDate}
          onToggleCalendar={toggleCalendar}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          onToday={goToToday}
        />
      </aside>

      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Month view */}
        <ResizablePanel defaultSize={selectedEvent ? 65 : 100} minSize={40}>
          <CalendarMonthView
            currentDate={currentDate}
            events={events}
            selectedEventId={selectedEvent?.id ?? null}
            onSelectEvent={setSelectedEvent}
            onSelectDate={() => {}}
          />
        </ResizablePanel>

        {/* Event detail panel */}
        {selectedEvent && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={25}>
              <CalendarEventDetail
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
