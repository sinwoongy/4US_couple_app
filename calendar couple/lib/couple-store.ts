import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { CalendarEvent, CoupleState } from "@/lib/types";

const FALLBACK_SYNC_EVENT = "couple-calendar-sync";

type CoupleRow = {
  id: string;
  invite_code: string;
  partner_one_name: string | null;
  partner_two_name: string | null;
  anniversary_date: string | null;
  updated_at: string | null;
};

type EventRow = {
  id: string;
  couple_id: string;
  title: string;
  date: string;
  note: string | null;
  color: string | null;
  all_day: boolean | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
};

type CreateEventPayload = Pick<
  CalendarEvent,
  "title" | "date" | "note" | "color" | "allDay" | "startTime" | "endTime"
>;

type UpdateEventPayload = CreateEventPayload;

export function createEmptyCoupleState(): CoupleState {
  return {
    partnerOneName: "",
    partnerTwoName: "",
    anniversaryDate: "",
    events: [],
    updatedAt: "",
  };
}

function getFallbackStorageKey(roomCode: string) {
  return `couple-calendar-fallback:${roomCode}`;
}

function mapEventRow(event: EventRow): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    note: event.note ?? "",
    color: event.color ?? "#d2644a",
    allDay: event.all_day ?? false,
    startTime: event.start_time ?? "",
    endTime: event.end_time ?? "",
    createdAt: event.created_at,
  };
}

function normalizeFallbackEvent(event: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: event.id ?? crypto.randomUUID(),
    title: event.title ?? "",
    date: event.date ?? "",
    note: event.note ?? "",
    color: event.color ?? "#d2644a",
    allDay: event.allDay ?? false,
    startTime: event.startTime ?? "",
    endTime: event.endTime ?? "",
    createdAt: event.createdAt ?? new Date().toISOString(),
  };
}

function mapCoupleState(couple: CoupleRow | null, events: EventRow[]): CoupleState {
  return {
    partnerOneName: couple?.partner_one_name ?? "",
    partnerTwoName: couple?.partner_two_name ?? "",
    anniversaryDate: couple?.anniversary_date ?? "",
    events: events.map(mapEventRow),
    updatedAt: couple?.updated_at ?? "",
  };
}

function normalizeFallbackState(input: Partial<CoupleState> | null | undefined): CoupleState {
  return {
    partnerOneName: input?.partnerOneName ?? "",
    partnerTwoName: input?.partnerTwoName ?? "",
    anniversaryDate: input?.anniversaryDate ?? "",
    events: Array.isArray(input?.events) ? input.events.map(normalizeFallbackEvent) : [],
    updatedAt: input?.updatedAt ?? "",
  };
}

function writeFallbackState(roomCode: string, nextState: CoupleState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getFallbackStorageKey(roomCode), JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent(FALLBACK_SYNC_EVENT, { detail: roomCode }));
}

function readFallbackState(roomCode: string): CoupleState {
  if (typeof window === "undefined") {
    return createEmptyCoupleState();
  }

  const saved = window.localStorage.getItem(getFallbackStorageKey(roomCode));

  if (!saved) {
    return createEmptyCoupleState();
  }

  try {
    return normalizeFallbackState(JSON.parse(saved) as Partial<CoupleState>);
  } catch {
    return createEmptyCoupleState();
  }
}

async function ensureCoupleByInviteCode(roomCode: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data: existingCouple, error: existingError } = await supabase
    .from("couples")
    .select("id, invite_code, partner_one_name, partner_two_name, anniversary_date, updated_at")
    .eq("invite_code", roomCode)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingCouple) {
    return existingCouple as CoupleRow;
  }

  const { data: insertedCouple, error: insertError } = await supabase
    .from("couples")
    .insert({
      invite_code: roomCode,
    })
    .select("id, invite_code, partner_one_name, partner_two_name, anniversary_date, updated_at")
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedCouple as CoupleRow;
}

async function fetchCoupleState(roomCode: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return readFallbackState(roomCode);
  }

  const couple = await ensureCoupleByInviteCode(roomCode);

  if (!couple) {
    return createEmptyCoupleState();
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, couple_id, title, date, note, color, all_day, start_time, end_time, created_at")
    .eq("couple_id", couple.id)
    .order("date", { ascending: true })
    .order("all_day", { ascending: false })
    .order("start_time", { ascending: true });

  if (eventsError) {
    throw eventsError;
  }

  return mapCoupleState(couple, (events ?? []) as EventRow[]);
}

export function subscribeToCoupleRoom(
  roomCode: string,
  onChange: (state: CoupleState) => void,
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    const nextState = readFallbackState(roomCode);
    onChange(nextState);

    const listener = (event: StorageEvent) => {
      if (event.key === getFallbackStorageKey(roomCode)) {
        onChange(readFallbackState(roomCode));
      }
    };
    const customListener = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;

      if (detail === roomCode) {
        onChange(readFallbackState(roomCode));
      }
    };

    window.addEventListener("storage", listener);
    window.addEventListener(FALLBACK_SYNC_EVENT, customListener);

    return () => {
      window.removeEventListener("storage", listener);
      window.removeEventListener(FALLBACK_SYNC_EVENT, customListener);
    };
  }

  let coupleChannel: RealtimeChannel | null = null;
  let eventsChannel: RealtimeChannel | null = null;
  let active = true;

  const syncState = async () => {
    try {
      const nextState = await fetchCoupleState(roomCode);

      if (active) {
        onChange(nextState);
      }
    } catch (error) {
      console.error("Failed to sync couple room", error);
    }
  };

  void (async () => {
    const couple = await ensureCoupleByInviteCode(roomCode);

    if (!couple || !active) {
      return;
    }

    await syncState();

    coupleChannel = supabase
      .channel(`couple-room:${roomCode}:couple`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couples",
          filter: `id=eq.${couple.id}`,
        },
        syncState,
      )
      .subscribe();

    eventsChannel = supabase
      .channel(`couple-room:${roomCode}:events`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `couple_id=eq.${couple.id}`,
        },
        syncState,
      )
      .subscribe();
  })();

  return () => {
    active = false;

    if (coupleChannel) {
      void supabase.removeChannel(coupleChannel);
    }

    if (eventsChannel) {
      void supabase.removeChannel(eventsChannel);
    }
  };
}

export async function updateCoupleDetails(
  roomCode: string,
  payload: Pick<CoupleState, "partnerOneName" | "partnerTwoName" | "anniversaryDate">,
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    const current = readFallbackState(roomCode);
    writeFallbackState(roomCode, {
      ...current,
      ...payload,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const couple = await ensureCoupleByInviteCode(roomCode);

  if (!couple) {
    return;
  }

  await supabase
    .from("couples")
    .update({
      partner_one_name: payload.partnerOneName,
      partner_two_name: payload.partnerTwoName,
      anniversary_date: payload.anniversaryDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", couple.id);
}

export async function createEvent(roomCode: string, payload: CreateEventPayload) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    const current = readFallbackState(roomCode);
    writeFallbackState(roomCode, {
      ...current,
      events: [
        ...current.events,
        {
          id: crypto.randomUUID(),
          title: payload.title,
          date: payload.date,
          note: payload.note,
          color: payload.color,
          allDay: payload.allDay,
          startTime: payload.startTime,
          endTime: payload.endTime,
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const couple = await ensureCoupleByInviteCode(roomCode);

  if (!couple) {
    return;
  }

  await supabase.from("events").insert({
    couple_id: couple.id,
    title: payload.title,
    date: payload.date,
    note: payload.note || null,
    color: payload.color,
    all_day: payload.allDay,
    start_time: payload.startTime || null,
    end_time: payload.endTime || null,
  });
}

export async function updateEvent(
  roomCode: string,
  eventId: string,
  payload: UpdateEventPayload,
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    const current = readFallbackState(roomCode);
    writeFallbackState(roomCode, {
      ...current,
      events: current.events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              title: payload.title,
              date: payload.date,
              note: payload.note,
              color: payload.color,
              allDay: payload.allDay,
              startTime: payload.startTime,
              endTime: payload.endTime,
            }
          : event,
      ),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const couple = await ensureCoupleByInviteCode(roomCode);

  if (!couple) {
    return;
  }

  await supabase
    .from("events")
    .update({
      title: payload.title,
      date: payload.date,
      note: payload.note || null,
      color: payload.color,
      all_day: payload.allDay,
      start_time: payload.startTime || null,
      end_time: payload.endTime || null,
    })
    .eq("id", eventId)
    .eq("couple_id", couple.id);
}

export async function deleteEvent(roomCode: string, eventId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    const current = readFallbackState(roomCode);
    writeFallbackState(roomCode, {
      ...current,
      events: current.events.filter((event) => event.id !== eventId),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const couple = await ensureCoupleByInviteCode(roomCode);

  if (!couple) {
    return;
  }

  await supabase.from("events").delete().eq("id", eventId).eq("couple_id", couple.id);
}
