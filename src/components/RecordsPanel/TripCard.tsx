import { useState } from 'react'
import type { Trip } from '../../types/trip'

interface Props {
  trip: Trip
  onEdit: (trip: Trip) => void
  onDelete: (id: string) => void
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className="text-base"
          style={{ color: rating >= star ? '#6366F1' : rating >= star - 0.5 ? '#A5B4FC' : '#E2E8F0' }}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
    </div>
  )
}

export default function TripCard({ trip, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-indigo-500 font-medium mb-0.5">
            {trip.dateFrom === trip.dateTo ? trip.dateFrom : `${trip.dateFrom} ~ ${trip.dateTo}`}
          </p>
          <StarRating rating={trip.rating} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-2 py-1">
            {trip.sigungu}
          </span>
          <button
            onClick={() => onEdit(trip)}
            className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
            title="수정"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(trip.id)}
                className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              title="삭제"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">📍 장소</p>
          <div className="flex flex-wrap gap-1.5">
            {trip.places.map((place) => (
              <button
                key={place}
                onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(place)}`, '_blank')}
                className="text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2 py-0.5 transition-colors text-left"
              >
                {place} ↗
              </button>
            ))}
          </div>
        </div>
        {trip.food && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">🍽 음식</p>
            <p className="text-sm text-gray-700">{trip.food}</p>
          </div>
        )}
        {trip.impression && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">💬 소감</p>
            <p className="text-sm text-gray-700 leading-relaxed">{trip.impression}</p>
          </div>
        )}
      </div>

      {trip.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {trip.tags.map((tag) => (
            <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5 font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
