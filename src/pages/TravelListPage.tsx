import { useState } from 'react'
import KoreaMap from '../components/KoreaMap/KoreaMap'
import RecordsPanel from '../components/RecordsPanel/RecordsPanel'
import { useTrips } from '../hooks/useTrips'

interface SelectedRegion {
  sidoCode: string
  sidoName: string
  sigunguCode: string
  sigunguName: string
}

export default function TravelListPage() {
  const { getTripsForSigungu, getSidoVisitCount, getSigunguVisitCount, addTrip, updateTrip, deleteTrip } = useTrips()
  const [selected, setSelected] = useState<SelectedRegion | null>(null)

  const handleSigunguSelect = (sigunguCode: string, sigunguName: string, sidoName: string) => {
    const sidoCode = sigunguCode.slice(0, 2)
    setSelected({ sidoCode, sidoName, sigunguCode, sigunguName })
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 탭 헤더 */}
      <div className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">여행 리스트</h1>
            <p className="text-xs text-gray-400">우리가 함께 간 곳들</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="bg-indigo-50 text-indigo-600 font-semibold px-3 py-1 rounded-full">
            시·도를 클릭해서 탐색하세요
          </span>
        </div>
      </div>

      {/* 지도 + 패널 영역 */}
      <div className="flex-1 relative overflow-hidden">
        <KoreaMap
          getSidoVisitCount={getSidoVisitCount}
          getSigunguVisitCount={getSigunguVisitCount}
          onSigunguSelect={handleSigunguSelect}
        />

        {selected && (
          <RecordsPanel
            sidoCode={selected.sidoCode}
            sidoName={selected.sidoName}
            sigunguCode={selected.sigunguCode}
            sigunguName={selected.sigunguName}
            trips={getTripsForSigungu(selected.sigunguCode)}
            onAdd={addTrip}
            onUpdate={updateTrip}
            onDelete={deleteTrip}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}
