"use client";

import { useEffect, useState } from "react";
import type { Trip } from "@/lib/types";
import { subscribeToTrips, fetchTrips, addTrip, updateTrip, deleteTrip } from "@/lib/trip-store";
import KoreaMap from "./KoreaMap/KoreaMap";
import RecordsPanel from "./RecordsPanel/RecordsPanel";

interface Props {
  roomCode: string;
}

function countUniquePeriods(trips: Trip[]): number {
  const periods = new Set(trips.map((t) => `${t.dateFrom}~${t.dateTo}`));
  return periods.size;
}

export default function TravelMap({ roomCode }: Props) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSigungu, setSelectedSigungu] = useState<{
    code: string;
    name: string;
    sidoCode: string;
    sidoName: string;
  } | null>(null);

  useEffect(() => {
    const unsub = subscribeToTrips(roomCode, setTrips);
    return unsub;
  }, [roomCode]);

  const refreshTrips = async () => {
    const updated = await fetchTrips(roomCode);
    setTrips(updated);
  };

  const getSidoVisitCount = (sidoCode: string) =>
    countUniquePeriods(trips.filter((t) => t.sidoCode === sidoCode));

  const getSigunguVisitCount = (sigunguCode: string) =>
    countUniquePeriods(trips.filter((t) => t.sigunguCode === sigunguCode));

  const handleSigunguSelect = (sigunguCode: string, sigunguName: string, sidoName: string) => {
    const sidoCode = sigunguCode.slice(0, 2);
    setSelectedSigungu({ code: sigunguCode, name: sigunguName, sidoCode, sidoName });
  };

  const handleAdd = async (payload: Omit<Trip, "id" | "createdAt" | "createdBy">) => {
    try {
      setError(null);
      await addTrip(roomCode, payload);
      await refreshTrips();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했어요.");
    }
  };

  const handleUpdate = async (
    id: string,
    payload: Omit<Trip, "id" | "createdAt" | "createdBy">,
  ) => {
    try {
      setError(null);
      await updateTrip(roomCode, id, payload);
      await refreshTrips();
    } catch (e) {
      setError(e instanceof Error ? e.message : "수정에 실패했어요.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await deleteTrip(roomCode, id);
      await refreshTrips();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제에 실패했어요.");
    }
  };

  const selectedTrips = selectedSigungu
    ? trips.filter((t) => t.sigunguCode === selectedSigungu.code)
    : [];

  return (
    <div className="map-wrapper" style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
      {error && (
        <div
          style={{
            position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, background: "#FEE2E2", border: "1px solid #FCA5A5",
            borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#991B1B",
            display: "flex", alignItems: "center", gap: 8, maxWidth: 400,
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#991B1B", fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      <KoreaMap
        getSidoVisitCount={getSidoVisitCount}
        getSigunguVisitCount={getSigunguVisitCount}
        onSigunguSelect={handleSigunguSelect}
      />

      {selectedSigungu && (
        <RecordsPanel
          sidoCode={selectedSigungu.sidoCode}
          sidoName={selectedSigungu.sidoName}
          sigunguCode={selectedSigungu.code}
          sigunguName={selectedSigungu.name}
          trips={selectedTrips}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setSelectedSigungu(null)}
        />
      )}
    </div>
  );
}
