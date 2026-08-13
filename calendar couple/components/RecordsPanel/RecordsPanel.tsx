"use client";

import { useState } from "react";
import type { Trip } from "@/lib/types";
import TripCard from "./TripCard";
import AddTripModal from "./AddTripModal";

interface Props {
  sidoCode: string;
  sidoName: string;
  sigunguCode: string;
  sigunguName: string;
  trips: Trip[];
  onAdd: (trip: Omit<Trip, "id" | "createdAt" | "createdBy">) => void;
  onUpdate: (id: string, trip: Omit<Trip, "id" | "createdAt" | "createdBy">) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function RecordsPanel({
  sidoCode,
  sidoName,
  sigunguCode,
  sigunguName,
  trips,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  return (
    <>
      <div className="map-records-panel">
        <div className="map-records-panel-header">
          <div>
            <p style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>
              {sidoName}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>{sigunguName}</h2>
            <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
              {trips.length > 0 ? `총 ${trips.length}개 기록` : "아직 방문 기록이 없어요"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ fontSize: 24, color: "#d1d5db", background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        <div className="map-records-panel-body">
          {trips.length === 0 ? (
            <div className="map-empty-state">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
              <p style={{ color: "#6b7280", fontWeight: 500, margin: 0 }}>아직 기록이 없어요</p>
              <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>첫 번째 여행을 기록해보세요!</p>
            </div>
          ) : (
            trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onEdit={(t) => setEditingTrip(t)}
                onDelete={onDelete}
              />
            ))
          )}
        </div>

        <div className="map-records-panel-footer">
          <button onClick={() => setShowAddModal(true)} className="map-add-button">
            <span style={{ fontSize: 18 }}>+</span>
            <span>이 지역 기록 추가</span>
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddTripModal
          sidoCode={sidoCode}
          sidoName={sidoName}
          sigunguCode={sigunguCode}
          sigunguName={sigunguName}
          onAdd={(trip) => {
            onAdd(trip);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingTrip && (
        <AddTripModal
          sidoCode={sidoCode}
          sidoName={sidoName}
          sigunguCode={sigunguCode}
          sigunguName={sigunguName}
          initialTrip={editingTrip}
          onUpdate={(id, trip) => {
            onUpdate(id, trip);
            setEditingTrip(null);
          }}
          onClose={() => setEditingTrip(null)}
        />
      )}
    </>
  );
}
