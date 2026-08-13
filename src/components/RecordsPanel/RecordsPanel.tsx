import { useState } from 'react'
import type { Trip } from '../../types/trip'
import TripCard from './TripCard'
import AddTripModal from './AddTripModal'

interface Props {
  sidoCode: string
  sidoName: string
  sigunguCode: string
  sigunguName: string
  trips: Trip[]
  onAdd: (trip: Omit<Trip, 'id' | 'createdAt' | 'createdBy'>) => void
  onUpdate: (id: string, trip: Omit<Trip, 'id' | 'createdAt' | 'createdBy'>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function RecordsPanel({
  sidoCode, sidoName, sigunguCode, sigunguName,
  trips, onAdd, onUpdate, onDelete, onClose,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)

  return (
    <>
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl z-[1000] flex flex-col border-l border-gray-100 animate-slide-in">
        {/* 헤더 */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-indigo-500 font-semibold uppercase tracking-widest mb-1">{sidoName}</p>
              <h2 className="text-xl font-bold text-gray-900">{sigunguName}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {trips.length > 0 ? `총 ${trips.length}개 기록` : '아직 방문 기록이 없어요'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-gray-500 text-2xl leading-none mt-0.5"
            >
              ×
            </button>
          </div>
        </div>

        {/* 기록 목록 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="text-5xl mb-3">🗺️</div>
              <p className="text-gray-500 font-medium">아직 기록이 없어요</p>
              <p className="text-gray-400 text-sm mt-1">첫 번째 여행을 기록해보세요!</p>
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

        {/* 추가 버튼 */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-indigo-600 text-white font-semibold rounded-2xl py-3.5 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span>
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
          onAdd={(trip) => { onAdd(trip); setShowAddModal(false) }}
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
          onUpdate={(id, trip) => { onUpdate(id, trip); setEditingTrip(null) }}
          onClose={() => setEditingTrip(null)}
        />
      )}
    </>
  )
}
