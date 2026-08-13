"use client";

import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  createEmptyCoupleState,
  createEvent,
  deleteEvent,
  subscribeToCoupleRoom,
  updateCoupleDetails,
  updateEvent,
} from "@/lib/couple-store";
import {
  buildCalendarDays,
  buildHalfHourOptions,
  compareCalendarEvents,
  formatDateLabel,
  formatEventTimeLabel,
  formatMonthLabel,
  formatSelectedDateLabel,
  getDDayLabel,
  isSameDay,
  toDateInputValue,
} from "@/lib/date-utils";
import { getHolidayLabel, isHoliday } from "@/lib/holiday-utils";
import type { CalendarEvent, CoupleState } from "@/lib/types";
import TravelMap from "@/components/TravelMap";

const FIXED_ROOM_CODE = process.env.NEXT_PUBLIC_COUPLE_CODE ?? "4us-minji";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DEFAULT_EVENT_COLOR = "#d2644a";
const TIME_OPTIONS = buildHalfHourOptions();
const EVENT_COLORS = [
  { label: "Coral", value: "#d2644a" },
  { label: "Rose", value: "#d94f70" },
  { label: "Sky", value: "#4d8df7" },
  { label: "Mint", value: "#3cae8f" },
  { label: "Amber", value: "#d99524" },
  { label: "Violet", value: "#7d63d3" },
];

type FeedbackTone = "success" | "error" | "info";

type FeedbackMessage = {
  tone: FeedbackTone;
  text: string;
};

type CalendarMonthProps = {
  currentMonth: Date;
  events: CalendarEvent[];
  selectedDate: string;
  quickAddOpen: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSelectDate: (date: string) => void;
  onToggleQuickAdd: () => void;
  quickAddContent: ReactNode;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    if (
      error.message.includes("all_day") ||
      error.message.includes("start_time") ||
      error.message.includes("end_time") ||
      error.message.includes("color")
    ) {
      return `${fallback} Supabase 테이블 컬럼이 아직 최신 구조로 반영되지 않았을 수 있어요.`;
    }

    return `${fallback} ${error.message}`;
  }

  return fallback;
}

function getEventColorStyle(color: string) {
  return {
    "--event-color": color || DEFAULT_EVENT_COLOR,
  } as CSSProperties;
}

function getDateToneClass(day: Date) {
  const weekday = day.getDay();

  if (isHoliday(day) || weekday === 0) {
    return "sunday";
  }

  if (weekday === 6) {
    return "saturday";
  }

  return "";
}

function CalendarMonth({
  currentMonth,
  events,
  selectedDate,
  quickAddOpen,
  onPrevious,
  onNext,
  onSelectDate,
  onToggleQuickAdd,
  quickAddContent,
}: CalendarMonthProps) {
  const days = buildCalendarDays(currentMonth);
  const today = new Date();

  return (
    <section className="calendar-card">
      <div className="calendar-header">
        <div>
          <p className="eyebrow">Shared Calendar</p>
          <h2>{formatMonthLabel(currentMonth)}</h2>
          <p className="helper-text">
            날짜를 누르면 바로 그 날짜 기준으로 Quick Add 창이 열려요.
          </p>
        </div>
        <div className="actions-row calendar-actions">
          <button className="ghost-button" onClick={onToggleQuickAdd} type="button">
            {quickAddOpen ? "Quick Add 닫기" : "Quick Add 열기"}
          </button>
          <button className="ghost-button" onClick={onPrevious} type="button">
            이전 달
          </button>
          <button className="ghost-button" onClick={onNext} type="button">
            다음 달
          </button>
        </div>
      </div>

      <div className="calendar-shell">
        {quickAddOpen ? <div className="quick-add-popover">{quickAddContent}</div> : null}

        <div className="calendar-grid">
          {WEEKDAYS.map((weekday, index) => {
            const toneClass = index === 0 ? "sunday" : index === 6 ? "saturday" : "";
            return (
              <div className={`weekday ${toneClass}`.trim()} key={weekday}>
                {weekday}
              </div>
            );
          })}

          {days.map((day) => {
            const dayEvents = events
              .filter((event) => isSameDay(event.date, day))
              .sort(compareCalendarEvents);
            const holidayLabel = getHolidayLabel(day);
            const isSelected = isSameDay(day, selectedDate);
            const dateToneClass = getDateToneClass(day);
            const classNames = [
              "day-cell",
              day.getMonth() !== currentMonth.getMonth() ? "muted" : "",
              isSameDay(day, today) ? "today" : "",
              isSelected ? "selected" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                className={classNames}
                key={day.toISOString()}
                onClick={() => onSelectDate(toDateInputValue(day))}
                type="button"
              >
                <span className="day-cell-header">
                  <span className={`day-number ${dateToneClass}`.trim()}>{day.getDate()}</span>
                </span>
                {holidayLabel ? <span className="holiday-label">{holidayLabel}</span> : null}
                <div className="day-events">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      className="event-pill"
                      key={event.id}
                      style={getEventColorStyle(event.color)}
                      title={event.title}
                    >
                      <span className="event-pill-time">{formatEventTimeLabel(event)}</span>
                      <span className="event-pill-title">{event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 ? (
                    <div className="event-pill more">+{dayEvents.length - 3}개 더 보기</div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeedbackBanner({
  message,
}: {
  message: FeedbackMessage | null;
}) {
  if (!message) {
    return null;
  }

  return (
    <p aria-live="polite" className={`feedback-banner ${message.tone}`}>
      {message.text}
    </p>
  );
}

export function CoupleDashboard() {
  const [activeTab, setActiveTab] = useState<"calendar" | "map">("calendar");
  const activeRoomCode = FIXED_ROOM_CODE;
  const [state, setState] = useState<CoupleState>(createEmptyCoupleState());
  const [syncReady, setSyncReady] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState(toDateInputValue(new Date()));
  const [newEventNote, setNewEventNote] = useState("");
  const [newEventColor, setNewEventColor] = useState(DEFAULT_EVENT_COLOR);
  const [newEventAllDay, setNewEventAllDay] = useState(false);
  const [newEventStartTime, setNewEventStartTime] = useState("");
  const [newEventEndTime, setNewEventEndTime] = useState("");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [detailsFeedback, setDetailsFeedback] = useState<FeedbackMessage | null>(null);
  const [eventFeedback, setEventFeedback] = useState<FeedbackMessage | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  useEffect(() => {
    setNewEventDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!newEventStartTime) {
      setNewEventEndTime("");
      return;
    }

    if (newEventEndTime && newEventEndTime <= newEventStartTime) {
      setNewEventEndTime("");
    }
  }, [newEventEndTime, newEventStartTime]);

  useEffect(() => {
    if (!activeRoomCode) {
      setState(createEmptyCoupleState());
      setSyncReady(false);
      return;
    }

    const unsubscribe = subscribeToCoupleRoom(activeRoomCode, (nextState) => {
      setState(nextState);
      setSyncReady(true);
    });

    return unsubscribe;
  }, [activeRoomCode]);

  const sortedEvents = useMemo(
    () => [...state.events].sort(compareCalendarEvents),
    [state.events],
  );

  const selectedDateEvents = useMemo(
    () => sortedEvents.filter((event) => isSameDay(event.date, selectedDate)),
    [selectedDate, sortedEvents],
  );

  const endTimeOptions = useMemo(
    () =>
      newEventStartTime
        ? TIME_OPTIONS.filter((option) => option > newEventStartTime)
        : [],
    [newEventStartTime],
  );

  const dDayLabel = useMemo(() => getDDayLabel(state.anniversaryDate), [state.anniversaryDate]);
  const editingEvent = useMemo(
    () => sortedEvents.find((event) => event.id === editingEventId) ?? null,
    [editingEventId, sortedEvents],
  );
  const isEditingEvent = Boolean(editingEventId);

  const coupleTitle = `${state.partnerOneName || "한 사람"} & ${state.partnerTwoName || "다른 사람"}`;

  const resetQuickAddForm = () => {
    setNewEventTitle("");
    setNewEventNote("");
    setNewEventColor(DEFAULT_EVENT_COLOR);
    setNewEventAllDay(false);
    setNewEventStartTime("");
    setNewEventEndTime("");
  };

  const openCreateFormForDate = (date: string) => {
    setEditingEventId(null);
    setSelectedDate(date);
    setNewEventDate(date);
    resetQuickAddForm();
    setIsQuickAddOpen(true);
  };

  const startEditingEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setSelectedDate(event.date);
    setNewEventDate(event.date);
    setNewEventTitle(event.title);
    setNewEventNote(event.note);
    setNewEventColor(event.color || DEFAULT_EVENT_COLOR);
    setNewEventAllDay(event.allDay);
    setNewEventStartTime(event.allDay ? "" : event.startTime);
    setNewEventEndTime(event.allDay ? "" : event.endTime);
    setIsQuickAddOpen(true);
    setEventFeedback({
      tone: "info",
      text: `${formatSelectedDateLabel(event.date)} 일정 수정 창을 열었어요.`,
    });
  };

  const closeQuickAdd = () => {
    setIsQuickAddOpen(false);
    setEditingEventId(null);
    resetQuickAddForm();
    setNewEventDate(selectedDate);
  };

  const handleSelectDate = (date: string) => {
    openCreateFormForDate(date);
    setEventFeedback({
      tone: "info",
      text: `${formatSelectedDateLabel(date)} 일정 입력 창을 열었어요.`,
    });
  };

  const handleCoupleDetailsSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const partnerOneName = String(formData.get("partnerOneName") ?? "").trim();
    const partnerTwoName = String(formData.get("partnerTwoName") ?? "").trim();
    const anniversaryDate = String(formData.get("anniversaryDate") ?? "");

    if (!partnerOneName && !partnerTwoName && !anniversaryDate) {
      setDetailsFeedback({
        tone: "error",
        text: "이름이나 기념일 중 하나 이상 입력해 주세요.",
      });
      return;
    }

    setIsSavingDetails(true);
    setDetailsFeedback(null);

    try {
      await updateCoupleDetails(activeRoomCode, {
        partnerOneName,
        partnerTwoName,
        anniversaryDate,
      });
      setDetailsFeedback({
        tone: "success",
        text: "커플 기본 정보를 저장했어요.",
      });
    } catch (error) {
      setDetailsFeedback({
        tone: "error",
        text: getErrorMessage(error, "기본 정보를 저장하지 못했어요."),
      });
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleEventCreate = async () => {
    const trimmedTitle = newEventTitle.trim();
    const trimmedNote = newEventNote.trim();

    if (!trimmedTitle) {
      setEventFeedback({
        tone: "error",
        text: "일정 제목을 입력해 주세요.",
      });
      return;
    }

    if (!newEventDate) {
      setEventFeedback({
        tone: "error",
        text: "일정 날짜를 선택해 주세요.",
      });
      return;
    }

    if (!newEventAllDay && !newEventStartTime) {
      setEventFeedback({
        tone: "error",
        text: "시작 시간을 먼저 선택해 주세요.",
      });
      return;
    }

    if (!newEventAllDay && !newEventEndTime) {
      setEventFeedback({
        tone: "error",
        text: "종료 시간을 선택해 주세요.",
      });
      return;
    }

    setIsCreatingEvent(true);
    setEventFeedback(null);

    try {
      const payload = {
        title: trimmedTitle,
        date: newEventDate,
        note: trimmedNote,
        color: newEventColor,
        allDay: newEventAllDay,
        startTime: newEventAllDay ? "" : newEventStartTime,
        endTime: newEventAllDay ? "" : newEventEndTime,
      };

      if (editingEventId) {
        await updateEvent(activeRoomCode, editingEventId, payload);
      } else {
        await createEvent(activeRoomCode, payload);
      }

      resetQuickAddForm();
      setSelectedDate(newEventDate);
      setIsQuickAddOpen(false);
      setEditingEventId(null);
      setEventFeedback({
        tone: "success",
        text: editingEventId
          ? `${formatSelectedDateLabel(newEventDate)} 일정을 수정했어요.`
          : `${formatSelectedDateLabel(newEventDate)} 일정이 추가됐어요.`,
      });
    } catch (error) {
      setEventFeedback({
        tone: "error",
        text: getErrorMessage(
          error,
          editingEventId ? "일정을 수정하지 못했어요." : "일정을 저장하지 못했어요.",
        ),
      });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleEventDelete = async (eventId: string) => {
    if (!activeRoomCode) {
      setEventFeedback({
        tone: "error",
        text: "먼저 커플 코드를 연결해 주세요.",
      });
      return;
    }

    setDeletingEventId(eventId);
    setEventFeedback(null);

    try {
      await deleteEvent(activeRoomCode, eventId);
      setEventFeedback({
        tone: "success",
        text: "일정을 삭제했어요.",
      });
    } catch (error) {
      setEventFeedback({
        tone: "error",
        text: getErrorMessage(error, "일정을 삭제하지 못했어요."),
      });
    } finally {
      setDeletingEventId(null);
    }
  };

  const quickAddContent = (
    <section className="quick-add-card">
      <div className="quick-add-header">
        <div>
          <p className="eyebrow">Quick Add</p>
          <h3>
            {formatSelectedDateLabel(newEventDate)}{" "}
            {isEditingEvent ? "일정 수정" : "일정 만들기"}
          </h3>
        </div>
          <button
          aria-label={isEditingEvent ? "일정 수정 창 닫기" : "Quick Add 닫기"}
          className="ghost-button quick-add-close"
          onClick={closeQuickAdd}
          type="button"
        >
          닫기
        </button>
      </div>

      <p className="helper-text quick-add-helper">
        {isEditingEvent
          ? "기존 일정 내용을 바로 수정하고 저장할 수 있어요."
          : "날짜를 바꾸지 않고 바로 메모까지 입력할 수 있는 미니 창이에요."}
      </p>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="eventTitle">일정 제목</label>
          <input
            id="eventTitle"
            maxLength={60}
            onChange={(event) => setNewEventTitle(event.target.value)}
            placeholder="예: 저녁 데이트"
            value={newEventTitle}
          />
        </div>

        <div className="field">
          <label htmlFor="eventDate">날짜</label>
          <input
            id="eventDate"
            onChange={(event) => {
              setNewEventDate(event.target.value);
              setSelectedDate(event.target.value);
            }}
            type="date"
            value={newEventDate}
          />
        </div>

        <div className="field">
          <label>색상</label>
          <div className="color-picker">
            {EVENT_COLORS.map((color) => (
              <button
                aria-label={`${color.label} color`}
                className={`color-swatch ${newEventColor === color.value ? "active" : ""}`}
                key={color.value}
                onClick={() => setNewEventColor(color.value)}
                style={{ backgroundColor: color.value }}
                type="button"
              />
            ))}
          </div>
        </div>

        <label className="checkbox-row" htmlFor="eventAllDay">
          <input
            checked={newEventAllDay}
            id="eventAllDay"
            onChange={(event) => {
              const checked = event.target.checked;
              setNewEventAllDay(checked);
              if (checked) {
                setNewEventStartTime("");
                setNewEventEndTime("");
              }
            }}
            type="checkbox"
          />
          <span>종일 일정</span>
        </label>

        {!newEventAllDay ? (
          <div className="field-grid two-col">
            <div className="field">
              <label htmlFor="eventStartTime">시작 시간</label>
              <select
                id="eventStartTime"
                onChange={(event) => setNewEventStartTime(event.target.value)}
                value={newEventStartTime}
              >
                <option value="">선택</option>
                {TIME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="eventEndTime">종료 시간</label>
              <select
                disabled={!newEventStartTime}
                id="eventEndTime"
                onChange={(event) => setNewEventEndTime(event.target.value)}
                value={newEventEndTime}
              >
                <option value="">{newEventStartTime ? "선택" : "시작 시간 먼저"}</option>
                {endTimeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="eventNote">메모</label>
          <textarea
            id="eventNote"
            maxLength={300}
            onChange={(event) => setNewEventNote(event.target.value)}
            placeholder="장소, 준비물, 같이 기억하고 싶은 내용을 적어 보세요."
            value={newEventNote}
          />
        </div>
      </div>

      <div className="actions-row">
        <button
          className="primary-button"
          disabled={!activeRoomCode || isCreatingEvent}
          onClick={handleEventCreate}
          type="button"
        >
          {isCreatingEvent
            ? isEditingEvent
              ? "수정 중..."
              : "추가 중..."
            : isEditingEvent
              ? "일정 수정"
              : "일정 추가"}
        </button>
        {isEditingEvent ? (
          <button className="ghost-button" onClick={closeQuickAdd} type="button">
            취소
          </button>
        ) : null}
      </div>
    </section>
  );

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-grid">
          <div>
            <p className="eyebrow">Couple Space</p>
            <h1 className="hero-title">COUPLE CALENDAR</h1>
            <p className="hero-description">
              둘만의 일정과 기념일을 한 공간에서 정리하고, 여행 기록을 지도에 남겨요.
            </p>
          </div>

          <div className="hero-stats">
            <div className="stat-card">
              <span>실시간 연결</span>
              <strong>{syncReady ? "연결됨" : "대기 중"}</strong>
            </div>
            <div className="stat-card">
              <span>D-Day</span>
              <strong>{dDayLabel}</strong>
            </div>
            <div className="stat-card">
              <span>등록된 일정</span>
              <strong>{sortedEvents.length}개</strong>
            </div>
            <div className="stat-card">
              <span>4US</span>
              <strong>♥</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 탭 네비게이션 */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("calendar")}
          style={{
            padding: "10px 24px",
            borderRadius: "999px",
            border: "1px solid var(--line)",
            background: activeTab === "calendar" ? "var(--primary)" : "var(--card)",
            color: activeTab === "calendar" ? "white" : "var(--text)",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          📅 캘린더
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("map")}
          style={{
            padding: "10px 24px",
            borderRadius: "999px",
            border: "1px solid var(--line)",
            background: activeTab === "map" ? "var(--primary)" : "var(--card)",
            color: activeTab === "map" ? "white" : "var(--text)",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          🗺️ 여행 지도
        </button>
      </div>

      {activeTab === "map" && (
        <TravelMap roomCode={activeRoomCode} />
      )}

      {activeTab === "calendar" && (
      <section className="dashboard-grid">
        <div className="side-column">
          <section className="panel">
            <p className="eyebrow">D-Day</p>
            <h2>커플 기본 정보</h2>
            <form className="field-grid" onSubmit={handleCoupleDetailsSave}>
              <div className="field-grid two-col">
                <div className="field">
                  <label htmlFor="partnerOneName">이름 1</label>
                  <input
                    defaultValue={state.partnerOneName}
                    id="partnerOneName"
                    name="partnerOneName"
                    placeholder="예: 유나"
                  />
                </div>
                <div className="field">
                  <label htmlFor="partnerTwoName">이름 2</label>
                  <input
                    defaultValue={state.partnerTwoName}
                    id="partnerTwoName"
                    name="partnerTwoName"
                    placeholder="예: 민호"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="anniversaryDate">기념일</label>
                <input
                  defaultValue={state.anniversaryDate}
                  id="anniversaryDate"
                  name="anniversaryDate"
                  type="date"
                />
              </div>

              <div className="actions-row">
                <button
                  className="primary-button"
                  disabled={isSavingDetails}
                  type="submit"
                >
                  {isSavingDetails ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </form>

            <FeedbackBanner message={detailsFeedback} />
          </section>

          <section className="panel">
            <p className="eyebrow">Day View</p>
            <h2>{formatSelectedDateLabel(selectedDate)} 일정</h2>
            {selectedDateEvents.length === 0 ? (
              <p className="empty-text">선택한 날짜에는 아직 등록된 일정이 없어요.</p>
            ) : (
              <div className="event-list compact">
                {selectedDateEvents.map((event) => (
                  <article className="event-item compact" key={event.id}>
                    <div className="event-item-header">
                      <div className="event-title-row">
                        <span
                          className="event-color-dot"
                          style={{ backgroundColor: event.color || DEFAULT_EVENT_COLOR }}
                        />
                        <h3>{event.title}</h3>
                      </div>
                      <span className="time-badge" style={getEventColorStyle(event.color)}>
                        {formatEventTimeLabel(event)}
                      </span>
                    </div>
                    {event.note ? <p className="event-note">{event.note}</p> : null}
                    <div className="actions-row">
                      <button
                        className="ghost-button"
                        onClick={() => startEditingEvent(event)}
                        type="button"
                      >
                        수정
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="main-column">
          <CalendarMonth
            currentMonth={currentMonth}
            events={sortedEvents}
            onNext={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
            }
            onPrevious={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
            }
            onSelectDate={handleSelectDate}
            onToggleQuickAdd={() => {
              if (isQuickAddOpen) {
                closeQuickAdd();
                return;
              }

              openCreateFormForDate(selectedDate);
            }}
            quickAddContent={quickAddContent}
            quickAddOpen={isQuickAddOpen}
            selectedDate={selectedDate}
          />

          <FeedbackBanner message={eventFeedback} />

          <section className="panel">
            <p className="eyebrow">Shared Events</p>
            <h2>{coupleTitle}의 전체 일정</h2>

            {sortedEvents.length === 0 ? (
              <p className="empty-text">
                아직 등록된 일정이 없어요. 달력에서 날짜를 눌러 첫 일정을 추가해 보세요.
              </p>
            ) : (
              <div className="event-list">
                {sortedEvents.map((event) => (
                  <article className="event-item" key={event.id}>
                    <div className="event-item-header">
                      <div>
                        <div className="event-title-row">
                          <span
                            className="event-color-dot"
                            style={{ backgroundColor: event.color || DEFAULT_EVENT_COLOR }}
                          />
                          <h3>{event.title}</h3>
                        </div>
                        <p className="event-meta">
                          {formatDateLabel(event.date)} · {formatEventTimeLabel(event)}
                        </p>
                      </div>
                      <button
                        className="ghost-button"
                        onClick={() => startEditingEvent(event)}
                        type="button"
                      >
                        수정
                      </button>
                      <button
                        className="ghost-button"
                        disabled={deletingEventId === event.id}
                        onClick={() => handleEventDelete(event.id)}
                        type="button"
                      >
                        {deletingEventId === event.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                    {event.note ? <p className="event-note">{event.note}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
      )}
    </main>
  );
}
