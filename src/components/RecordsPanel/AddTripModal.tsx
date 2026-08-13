import { useState } from 'react'
import type { Trip } from '../../types/trip'

interface Props {
  sidoCode: string
  sidoName: string
  sigunguCode: string
  sigunguName: string
  initialTrip?: Trip
  onAdd?: (trip: Omit<Trip, 'id' | 'createdAt' | 'createdBy'>) => void
  onUpdate?: (id: string, trip: Omit<Trip, 'id' | 'createdAt' | 'createdBy'>) => void
  onClose: () => void
}

const PRESET_TAGS = ['#분위기좋음', '#재방문의사', '#가성비', '#맛집투어', '#힐링', '#자연', '#역사', '#산책', '#드라이브', '#야경']

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="text-2xl transition-colors"
          style={{ color: display >= star ? '#6366F1' : '#E2E8F0' }}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
      <span className="text-sm text-gray-500 ml-1">{value > 0 ? `${value}점` : '점수 선택'}</span>
    </div>
  )
}

export default function AddTripModal({
  sidoCode, sidoName, sigunguCode, sigunguName,
  initialTrip, onAdd, onUpdate, onClose,
}: Props) {
  const isEditMode = !!initialTrip
  const today = new Date().toISOString().slice(0, 10)

  const [isSingleDay, setIsSingleDay] = useState(
    !initialTrip || initialTrip.dateFrom === initialTrip.dateTo
  )
  const [dateFrom, setDateFrom] = useState(initialTrip?.dateFrom ?? today)
  const [dateTo, setDateTo] = useState(initialTrip?.dateTo ?? today)
  const [placesInput, setPlacesInput] = useState(initialTrip?.places.join(', ') ?? '')
  const [food, setFood] = useState(initialTrip?.food ?? '')
  const [impression, setImpression] = useState(initialTrip?.impression ?? '')
  const [rating, setRating] = useState(initialTrip?.rating ?? 0)
  const [tags, setTags] = useState<string[]>(initialTrip?.tags ?? [])
  const [customTag, setCustomTag] = useState('')

  const handleSingleDayToggle = (single: boolean) => {
    setIsSingleDay(single)
    if (single) setDateTo(dateFrom)
  }

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    if (isSingleDay) setDateTo(value)
    else if (dateTo < value) setDateTo(value)
  }

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  const addCustomTag = () => {
    const t = customTag.trim()
    if (!t) return
    const formatted = t.startsWith('#') ? t : `#${t}`
    if (!tags.includes(formatted)) setTags((prev) => [...prev, formatted])
    setCustomTag('')
  }

  const handleSubmit = () => {
    if (!dateFrom || rating === 0) return
    const resolvedDateTo = isSingleDay ? dateFrom : dateTo
    const places = placesInput.split(',').map((p) => p.trim()).filter(Boolean)
    const payload = {
      sido: sidoName, sidoCode,
      sigungu: sigunguName, sigunguCode,
      dateFrom, dateTo: resolvedDateTo,
      places, food, impression, rating, tags,
      photos: initialTrip?.photos ?? [],
    }
    if (isEditMode && onUpdate) {
      onUpdate(initialTrip!.id, payload)
    } else if (onAdd) {
      onAdd(payload)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white rounded-t-3xl px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEditMode ? '여행 기록 수정' : '새 여행 기록'}
              </h2>
              <p className="text-sm text-indigo-500 font-medium mt-0.5">{sidoName} · {sigunguName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* 날짜 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">방문 날짜 *</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleSingleDayToggle(true)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isSingleDay ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                당일
              </button>
              <button
                type="button"
                onClick={() => handleSingleDayToggle(false)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  !isSingleDay ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                기간 선택
              </button>
            </div>
            {isSingleDay ? (
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="text-gray-400 text-sm">~</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
          </div>

          {/* 장소 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">장소</label>
            <input
              type="text"
              value={placesInput}
              onChange={(e) => setPlacesInput(e.target.value)}
              placeholder="홍대 걷고싶은거리, 망원시장 (쉼표로 구분)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* 음식 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">뭐 먹었어?</label>
            <input
              type="text"
              value={food}
              onChange={(e) => setFood(e.target.value)}
              placeholder="닭갈비, 크레이프, 아메리카노..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* 소감 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">소감</label>
            <textarea
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              placeholder="어땠어? 기억나는 순간, 느낀 것들을 자유롭게 써줘..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* 별점 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">별점 *</label>
            <StarInput value={rating} onChange={setRating} />
          </div>

          {/* 태그 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">태그</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${
                    tags.includes(tag)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                placeholder="직접 입력"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200"
              >
                추가
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-3xl px-6 pb-6 pt-4 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={rating === 0}
            className="w-full bg-indigo-600 text-white font-semibold rounded-2xl py-3.5 hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEditMode ? '수정 저장하기' : '기록 저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
