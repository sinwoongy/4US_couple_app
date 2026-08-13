# 4US 개발 로그

커플 공유 앱 4US의 개발 히스토리를 기록합니다.

---

## [1단계] 프로젝트 초기 설정

**작업 내용**
- CLAUDE.md 프로젝트 지침 파일 작성 (기술스택, 개발원칙, 디렉토리 구조)
- REQUIREMENTS.md 요구사항 문서 초안 작성 (F-01 ~ F-07 기능 정의, Firestore 데이터 모델)
- Vite + React + TypeScript 프로젝트 scaffolding
- 의존성 설치: `react-leaflet`, `leaflet`, `firebase`, `tailwindcss`
- `package.json`에 `"type": "module"` 추가 (ESM 경고 해결)
- `.env.example` Firebase 환경변수 키 목록 작성
- `.claude/` 개발 워크플로 설정 (commands, agents, skills)

**확정 기술스택**
| 역할 | 기술 |
|------|------|
| 프론트엔드 | React 18 + TypeScript + Vite |
| 스타일링 | Tailwind CSS |
| 지도 | Leaflet + react-leaflet |
| 행정구역 데이터 | GeoJSON (통계청, southkorea-maps) |
| 백엔드 (예정) | Firebase Auth + Firestore + Storage |

---

## [2단계] 여행 리스트 탭 — 기본 구현

**작업 내용**

### GeoJSON 데이터 준비
- `public/geojson/sido.json` — 전국 17개 시·도 GeoJSON 다운로드
- `public/geojson/sigungu.json` — 전국 251개 시·군·구 GeoJSON 다운로드
- 출처: github.com/southkorea/southkorea-maps (통계청 2012년 기준)

### 타입 및 데이터
- `src/types/trip.ts` — `Trip` 인터페이스 정의
  - 필드: id, sido, sidoCode, sigungu, sigunguCode, dateFrom, dateTo, places, food, impression, rating, tags, photos, createdBy, createdAt
- `src/data/mockTrips.ts` — 더미 여행 데이터 7건 (서울, 경기, 제주, 부산)
- `src/hooks/useTrips.ts` — 여행 데이터 관리 훅

### 지도 컴포넌트 (`src/components/KoreaMap/KoreaMap.tsx`)
- 흰색 배경 지도 (타일 레이어 없음, OpenStreetMap 미사용)
- 시·도 레벨 → 클릭 시 해당 도의 시·군·구로 드릴다운
- 방문 횟수별 인디고 블루 색상 스케일 (`#FFFFFF` ~ `#4F46E5`)
- 호버 시 툴팁 표시
- 전국 지도로 돌아가기 버튼
- 방문 횟수 범례 (우하단)
- 시·도/시·군·구 코드 연결: sigunguCode 앞 2자리 = sidoCode

### 기록 패널 (`src/components/RecordsPanel/`)
- `RecordsPanel.tsx` — 우측 슬라이드인 패널 (w-96, animate-slide-in)
- `TripCard.tsx` — 개별 여행 기록 카드 (날짜, 별점, 장소, 음식, 소감, 태그)
- `AddTripModal.tsx` — 기록 추가 모달 (날짜, 장소, 음식, 소감, 별점, 태그)
  - 프리셋 태그 10개 + 커스텀 태그 입력 지원

### 페이지
- `src/pages/TravelListPage.tsx` — 지도 + 패널 통합 페이지

### 스타일 (`src/index.css`)
- Pretendard 폰트 (CDN)
- 커스텀 툴팁 스타일 `.leaflet-tooltip-custom`
- 슬라이드인 애니메이션 `@keyframes slide-in`

---

## [3단계] 지도 UX 개선

### 지역명 상시 라벨 표시
- 시·도, 시·군·구 이름이 호버하지 않아도 지도 위에 항상 표시
- Leaflet `bindTooltip({ permanent: true, direction: 'center' })` 활용
- 방문 3회 이상(짙은 인디고) 지역은 텍스트 흰색으로 자동 전환
- 호버 시 방문 횟수 추가 표시
- CSS 클래스 `.leaflet-label-sido`, `.leaflet-label-sigungu`

### 라벨 오버플로 수정 (당진, 서산 등)
- Leaflet 기본 `white-space: nowrap` 오버라이드 (specificity 문제)
- 선택자를 `.leaflet-tooltip.leaflet-label-sido`로 강화
- `white-space: normal !important`, `max-width: 64~80px`, `word-break: keep-all` 적용

### 지도 이동 범위 제한
- `maxBounds` 설정으로 한반도 밖으로 드래그 불가
- `maxBoundsViscosity: 1.0` — 경계에서 딱 멈춤
- `minZoom: 7` — 전국 뷰보다 더 축소 불가
- `SetMaxBounds` 컴포넌트 — 도 선택 시 해당 도 bounds로 동적 교체, 전국 뷰 복귀 시 원복
  - 이전: `window.L` 사용 (Vite ESM 환경에서 undefined) → `import L from 'leaflet'`으로 수정

### 도 클릭 시 줌 이동 수정
- `FitBoundsOnSelect`에서 `window.L` → `import L` 직접 사용으로 수정
- 클릭한 도의 GeoJSON bounds를 한반도 범위 내로 clamp 후 `fitBounds` 호출

---

## [4단계] 날짜 → 기간 선택 기능

**배경**: 같은 여행 중 여러 지역에 기록을 남기면 방문 횟수가 중복 카운트되는 문제

**변경 사항**
- `Trip` 타입: `date: string` → `dateFrom: string`, `dateTo: string`
- `AddTripModal`: "당일 / 기간 선택" 토글 버튼 추가
  - 당일 선택 시: 날짜 하나
  - 기간 선택 시: 시작일 ~ 종료일 두 개, `min` 제약으로 역순 방지
- `TripCard`: 당일이면 날짜 하나, 기간이면 `YYYY-MM-DD ~ YYYY-MM-DD` 표시
- `useTrips`: 방문 횟수를 **고유 기간 수**로 카운트
  - `countUniquePeriods()` — `Set("dateFrom~dateTo")` 기준
  - 동일 기간 + 동일 지역 = 1회 방문
  - 시·도 / 시·군·구 모두 동일 로직 적용

---

## [5단계] 기록 수정 및 삭제 기능

**변경 사항**

### `useTrips.ts`
- `updateTrip(id, updates)` 추가
- `deleteTrip(id)` 추가

### `AddTripModal.tsx`
- 편집 모드 지원: `initialTrip?: Trip` prop
- 편집 모드 시 기존 값 prefill, 제목/버튼 텍스트 변경 ("수정 저장하기")
- `onUpdate?: (id, trip) => void` 콜백 추가

### `TripCard.tsx`
- 우측 상단에 수정(연필) / 삭제(휴지통) 아이콘 버튼 추가
- 삭제: 아이콘 클릭 → 카드 내 "삭제 / 취소" 인라인 확인 (실수 방지)

### `RecordsPanel.tsx`
- `editingTrip: Trip | null` 상태 관리
- 수정 모달: `AddTripModal`을 `initialTrip` prop과 함께 열기
- `onUpdate`, `onDelete` props 추가

### `TravelListPage.tsx`
- `updateTrip`, `deleteTrip` 핸들러 연결

---

## [6단계] 네이버 지도 연동

**배경**: 기록된 장소를 실제 지도에서 확인하고 싶은 니즈

**방식**: URL scheme 활용 (API 키 불필요)
```
https://map.naver.com/v5/search/{장소명}
```

**변경 사항**
- `TripCard.tsx`: 장소 목록을 텍스트 → 클릭 가능한 버튼으로 변경
- 클릭 시 `window.open(naverUrl, '_blank')` — 새 탭으로 네이버 지도 검색 결과 열기

---

## 현재 구현 상태

### 완료된 기능
- [x] 한국 시·도 / 시·군·구 지도 (드릴다운)
- [x] 방문 지역 인디고 블루 색칠 (횟수별 농도)
- [x] 지역명 상시 라벨
- [x] 여행 기록 추가 (날짜/기간, 장소, 음식, 소감, 별점, 태그)
- [x] 여행 기록 수정 / 삭제
- [x] 방문 횟수 중복 카운트 방지 (기간 기준 고유 집계)
- [x] 네이버 지도 연동 (장소 클릭 → 새 탭)
- [x] 지도 이동 범위 제한

### 미구현 (REQUIREMENTS.md 기준 우선순위)
- [ ] F-01: Firebase Auth 로그인 (구글 로그인)
- [ ] F-02: 커플 페어링 (초대 코드)
- [ ] F-03: Firebase Firestore 연동 (현재 메모리 상태만)
- [ ] F-04: 사진 업로드 (Firebase Storage)
- [ ] F-06: 캘린더 / 일정 공유
- [ ] F-07: 홈 대시보드
- [x] 광역시 외 일반 시(市)의 구(區) 통합 렌더링 (→ [7단계])

---

## [7단계] 일반 시(市) 구(區) 통합 렌더링

**배경**: 성남시, 수원시 등 일반 도 소속 시에도 구가 있어 GeoJSON 상 여러 폴리곤으로 분리되어 있었음. 광역시(서울, 부산 등)의 구는 개별 클릭 단위로 유지.

**방법**: `@turf/union` v7으로 폴리곤 합치기

- `src/utils/mergeSimpleCities.ts` 신규 작성
  - 광역시 sido 코드(11, 21~26, 29)는 개별 구 유지
  - 나머지 도 지역의 시군구는 코드 앞 4자리로 그룹핑
  - 같은 그룹 내 2개 이상 = 일반 시의 구들 → `@turf/union`으로 폴리곤 합치기
  - 합쳐진 시의 name: 구 이름에서 시 이름 추출 (예: "수원시장안구" → "수원시")
  - 예외 lookup: 포항시(`3701`), 창원시(`3811`) — 구 이름에 시 이름 미포함
  - synthetic code: 그룹 키 + "0" (예: "31010" for 수원시)
- `KoreaMap.tsx`: sigungu GeoJSON 로딩 후 `mergeSimpleCityDistricts()` 적용

**대상 시 (12개)**
수원시, 성남시, 안양시, 부천시, 안산시, 고양시, 용인시, 청주시, 천안시, 전주시, 포항시, 창원시

**부가 수정**: mock 데이터 코드 오류 수정
- 경기도 sidoCode `41` → `31` (GeoJSON 실제 코드)
- 마포구 `11440` → `11140`
- 수원시 `41110` → `31010` (synthetic)
- 가평군 `41820` → `31370`
- 해운대구 `21350` → `21090`

---

## 알려진 이슈 / TODO

- 현재 데이터는 메모리 상태 (새로고침 시 초기화됨) → Firebase 연동 후 해결
- 광역시 외 시(예: 성남시)의 구를 하나의 시로 묶어 렌더링하는 기능 미구현
- 사진 업로드 UI는 있으나 실제 Storage 연동 미완료
