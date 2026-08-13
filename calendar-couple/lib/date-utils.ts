import type { CalendarEvent } from "@/lib/types";

function parseDateValue(value: string | Date) {
  if (value instanceof Date) {
    return new Date(value);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

export function toDateInputValue(value: string | Date) {
  const date = parseDateValue(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDDayLabel(anniversaryDate: string) {
  if (!anniversaryDate) {
    return "미설정";
  }

  const start = parseDateValue(anniversaryDate);
  const today = new Date();

  if (Number.isNaN(start.getTime())) {
    return "날짜 오류";
  }

  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const days = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;

  return `D+${days}`;
}

export function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(value);
}

export function formatSelectedDateLabel(value: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parseDateValue(value));
}

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parseDateValue(value));
}

export function formatEventTimeLabel(
  event: Pick<CalendarEvent, "allDay" | "startTime" | "endTime">,
) {
  if (event.allDay) {
    return "종일";
  }

  if (event.startTime && event.endTime) {
    return `${event.startTime} - ${event.endTime}`;
  }

  if (event.startTime) {
    return event.startTime;
  }

  return "시간 미정";
}

export function buildHalfHourOptions() {
  return Array.from({ length: 48 }, (_, index) => {
    const hours = String(Math.floor(index / 2)).padStart(2, "0");
    const minutes = index % 2 === 0 ? "00" : "30";
    return `${hours}:${minutes}`;
  });
}

export function compareCalendarEvents(left: CalendarEvent, right: CalendarEvent) {
  const dateDifference =
    parseDateValue(left.date).getTime() - parseDateValue(right.date).getTime();

  if (dateDifference !== 0) {
    return dateDifference;
  }

  if (left.allDay !== right.allDay) {
    return left.allDay ? -1 : 1;
  }

  const leftTime = left.startTime || "99:99";
  const rightTime = right.startTime || "99:99";
  return leftTime.localeCompare(rightTime);
}

export function buildCalendarDays(currentMonth: Date) {
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const start = new Date(startOfMonth);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const nextDate = new Date(start);
    nextDate.setDate(start.getDate() + index);
    return nextDate;
  });
}

export function isSameDay(left: string | Date, right: string | Date) {
  const leftDate = parseDateValue(left);
  const rightDate = parseDateValue(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}
