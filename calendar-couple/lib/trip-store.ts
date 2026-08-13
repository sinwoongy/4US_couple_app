import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Trip } from "@/lib/types";

const FALLBACK_TRIPS_KEY = (roomCode: string) => `couple-trips-fallback:${roomCode}`;
const FALLBACK_SYNC_EVENT = "couple-trips-sync";

type TripRow = {
  id: string;
  couple_id: string;
  sido: string;
  sido_code: string;
  sigungu: string;
  sigungu_code: string;
  date_from: string;
  date_to: string;
  places: string[];
  food: string;
  impression: string;
  rating: number;
  tags: string[];
  created_by: string;
  created_at: string;
};

export type TripPayload = Omit<Trip, "id" | "createdAt" | "createdBy">;

function mapTripRow(row: TripRow): Trip {
  return {
    id: row.id,
    sido: row.sido,
    sidoCode: row.sido_code,
    sigungu: row.sigungu,
    sigunguCode: row.sigungu_code,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    places: row.places ?? [],
    food: row.food ?? "",
    impression: row.impression ?? "",
    rating: Number(row.rating),
    tags: row.tags ?? [],
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
  };
}

function readFallbackTrips(roomCode: string): Trip[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(FALLBACK_TRIPS_KEY(roomCode));
    return saved ? (JSON.parse(saved) as Trip[]) : [];
  } catch {
    return [];
  }
}

function writeFallbackTrips(roomCode: string, trips: Trip[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FALLBACK_TRIPS_KEY(roomCode), JSON.stringify(trips));
  window.dispatchEvent(new CustomEvent(FALLBACK_SYNC_EVENT, { detail: roomCode }));
}

// couple 행이 없으면 생성 후 id 반환
async function ensureAndGetCoupleId(roomCode: string): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("couples")
    .select("id")
    .eq("invite_code", roomCode)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: inserted, error } = await supabase
    .from("couples")
    .insert({ invite_code: roomCode })
    .select("id")
    .single();

  if (error) {
    console.error("[trip-store] couple 생성 실패:", error.message);
    return null;
  }
  return inserted?.id ?? null;
}

// trips 목록 직접 조회
export async function fetchTrips(roomCode: string): Promise<Trip[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return readFallbackTrips(roomCode);

  const coupleId = await ensureAndGetCoupleId(roomCode);
  if (!coupleId) return [];

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("couple_id", coupleId)
    .order("date_from", { ascending: false });

  if (error) {
    console.error("[trip-store] trips 조회 실패:", error.message);
    return [];
  }
  return (data ?? []).map(mapTripRow);
}

export function subscribeToTrips(
  roomCode: string,
  onChange: (trips: Trip[]) => void,
): () => void {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    onChange(readFallbackTrips(roomCode));
    const storageListener = (e: StorageEvent) => {
      if (e.key === FALLBACK_TRIPS_KEY(roomCode)) onChange(readFallbackTrips(roomCode));
    };
    const customListener = (e: Event) => {
      if ((e as CustomEvent<string>).detail === roomCode) onChange(readFallbackTrips(roomCode));
    };
    window.addEventListener("storage", storageListener);
    window.addEventListener(FALLBACK_SYNC_EVENT, customListener);
    return () => {
      window.removeEventListener("storage", storageListener);
      window.removeEventListener(FALLBACK_SYNC_EVENT, customListener);
    };
  }

  let channel: RealtimeChannel | null = null;
  let active = true;

  const syncTrips = async () => {
    const trips = await fetchTrips(roomCode);
    if (active) onChange(trips);
  };

  void (async () => {
    const coupleId = await ensureAndGetCoupleId(roomCode);
    if (!coupleId || !active) return;

    await syncTrips();

    channel = supabase
      .channel(`couple-room:${roomCode}:trips`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips", filter: `couple_id=eq.${coupleId}` },
        syncTrips,
      )
      .subscribe();
  })();

  return () => {
    active = false;
    if (channel) void supabase.removeChannel(channel);
  };
}

export async function addTrip(roomCode: string, payload: TripPayload): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    const trips = readFallbackTrips(roomCode);
    writeFallbackTrips(roomCode, [
      { ...payload, id: crypto.randomUUID(), createdBy: "me", createdAt: new Date().toISOString() },
      ...trips,
    ]);
    return;
  }

  const coupleId = await ensureAndGetCoupleId(roomCode);
  if (!coupleId) throw new Error("커플 ID를 가져올 수 없어요.");

  const { error } = await supabase.from("trips").insert({
    couple_id: coupleId,
    sido: payload.sido,
    sido_code: payload.sidoCode,
    sigungu: payload.sigungu,
    sigungu_code: payload.sigunguCode,
    date_from: payload.dateFrom,
    date_to: payload.dateTo,
    places: payload.places,
    food: payload.food,
    impression: payload.impression,
    rating: payload.rating,
    tags: payload.tags,
    created_by: "me",
  });

  if (error) throw new Error(error.message);
}

export async function updateTrip(
  roomCode: string,
  tripId: string,
  payload: TripPayload,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    const trips = readFallbackTrips(roomCode);
    writeFallbackTrips(
      roomCode,
      trips.map((t) => (t.id === tripId ? { ...t, ...payload } : t)),
    );
    return;
  }

  const coupleId = await ensureAndGetCoupleId(roomCode);
  if (!coupleId) throw new Error("커플 ID를 가져올 수 없어요.");

  const { error } = await supabase
    .from("trips")
    .update({
      sido: payload.sido,
      sido_code: payload.sidoCode,
      sigungu: payload.sigungu,
      sigungu_code: payload.sigunguCode,
      date_from: payload.dateFrom,
      date_to: payload.dateTo,
      places: payload.places,
      food: payload.food,
      impression: payload.impression,
      rating: payload.rating,
      tags: payload.tags,
    })
    .eq("id", tripId)
    .eq("couple_id", coupleId);

  if (error) throw new Error(error.message);
}

export async function deleteTrip(roomCode: string, tripId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    const trips = readFallbackTrips(roomCode);
    writeFallbackTrips(
      roomCode,
      trips.filter((t) => t.id !== tripId),
    );
    return;
  }

  const coupleId = await ensureAndGetCoupleId(roomCode);
  if (!coupleId) throw new Error("커플 ID를 가져올 수 없어요.");

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("couple_id", coupleId);

  if (error) throw new Error(error.message);
}
