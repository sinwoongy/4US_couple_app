export interface Trip {
  id: string
  sido: string        // e.g. "경기도"
  sidoCode: string    // e.g. "41"
  sigungu: string     // e.g. "수원시"
  sigunguCode: string // e.g. "41110"
  dateFrom: string    // YYYY-MM-DD
  dateTo: string      // YYYY-MM-DD (당일이면 dateFrom과 동일)
  places: string[]
  food: string
  impression: string
  rating: number      // 1.0 ~ 5.0 (0.5 단위)
  tags: string[]
  photos: string[]    // URL or data URL
  createdBy: string
  createdAt: string
}

export interface GeoFeatureProperties {
  code: string
  name: string
  name_eng: string
  base_year: string
}
