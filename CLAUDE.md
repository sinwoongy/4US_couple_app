# CLAUDE.md — 4US (커플 공유 앱) 프로젝트 지침

이 파일은 커플 데이트 기록·공유 웹앱 **4US**를 개발할 때 Claude가 참고하는 지침서입니다.

---

## 1. 프로젝트 개요

**4US**는 커플 두 명이 함께 데이트 경험을 기록하고 공유하는 PC 웹 애플리케이션입니다.

### 핵심 기능

| # | 기능 | 구현 상태 |
|---|------|-----------|
| 1 | **여행 지도** | ✅ 완료 — 한국 시·도/시·군·구 색칠 지도, 방문 기록 CRUD |
| 2 | **캘린더·일정 공유** | ✅ 완료 — 커플 코드로 연결, Supabase 실시간 동기화 |
| 3 | **커플 연동** | ✅ 완료 — 초대 코드(roomCode) 방식, localStorage 폴백 |
| 4 | **후기 작성** | 미구현 |
| 5 | **사진 업로드** | 미구현 |

### 확정 기술 스택

| 역할 | 기술 | 비고 |
|------|------|------|
| **프레임워크** | Next.js 16 (App Router) | Turbopack 기본 활성화 |
| **언어** | TypeScript (strict) | — |
| **스타일링** | Tailwind CSS v4 + Pure CSS 혼용 | `@tailwindcss/postcss`, 기존 커스텀 CSS 유지 |
| **DB / 인증** | Supabase (PostgreSQL + Realtime) | 사용자 계정 보유, anon key 클라이언트 사용 |
| **지도** | Leaflet + react-leaflet | SSR 비호환 → `dynamic(..., { ssr: false })` 필수 |
| **지도 데이터** | GeoJSON (southkorea-maps, 통계청 2012) | sido.json / sigungu.json |
| **폴리곤 합치기** | @turf/union v7 | v7 API: FeatureCollection 인자 |
| **패키지 관리** | npm | — |
| **호스팅 예정** | Vercel | — |

---

## 2. 메인 작업 디렉토리

**`calendar couple/`** 가 메인 프로젝트입니다. `4US_Minji/` 루트의 Vite 프로젝트는 지도 기능 프로토타입으로만 보존되어 있습니다.

```
4US_Minji/
├── calendar couple/        ← ★ 메인 프로젝트 (Next.js)
│   ├── app/
│   │   ├── globals.css     # Tailwind utilities + Leaflet 라벨 CSS + 슬라이드인 애니메이션
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── KoreaMap/
│   │   │   ├── KoreaMap.tsx        # dynamic import 래퍼 (ssr: false)
│   │   │   └── KoreaMapInner.tsx   # Leaflet 실제 코드
│   │   ├── RecordsPanel/
│   │   │   ├── RecordsPanel.tsx    # 우측 슬라이드 패널
│   │   │   ├── TripCard.tsx        # 여행 기록 카드
│   │   │   └── AddTripModal.tsx    # 기록 추가/수정 모달
│   │   ├── TravelMap.tsx           # 지도 탭 페이지 컴포넌트
│   │   └── couple-dashboard.tsx    # 메인 대시보드 (캘린더 + 탭 네비게이션)
│   ├── lib/
│   │   ├── types.ts        # CalendarEvent, CoupleState, Trip, GeoFeatureProperties
│   │   ├── couple-store.ts # Supabase 캘린더 CRUD + localStorage 폴백
│   │   ├── trip-store.ts   # Supabase 여행 기록 CRUD + localStorage 폴백
│   │   ├── date-utils.ts
│   │   ├── holiday-utils.ts
│   │   └── supabase.ts
│   ├── utils/
│   │   └── mergeSimpleCities.ts  # 일반 시(市) 구(區) 폴리곤 통합
│   ├── public/
│   │   └── geojson/
│   │       ├── sido.json     # 전국 17개 시·도
│   │       └── sigungu.json  # 전국 시·군·구
│   ├── supabase/
│   │   └── schema.sql        # couples, events, trips 테이블 + RLS + Realtime
│   ├── .env.local            # Supabase URL / anon key (git 제외)
│   ├── postcss.config.mjs    # @tailwindcss/postcss 설정
│   └── next.config.ts
└── src/                    ← Vite 프로토타입 (참고용, 메인 아님)
```

---

## 3. Supabase 데이터 구조

```sql
-- 커플 방 (roomCode = invite_code)
couples: id, invite_code (unique), partner_one_name, partner_two_name, anniversary_date

-- 캘린더 일정
events: id, couple_id (FK), title, date, note, color, all_day, start_time, end_time

-- 여행 기록
trips: id, couple_id (FK), sido, sido_code, sigungu, sigungu_code,
       date_from, date_to, places[], food, impression, rating, tags[], created_by
```

- 커플 연결 방식: `invite_code`(roomCode)로 couple 행을 찾거나 생성 — 별도 인증 없음
- RLS: 현재 전체 공개 정책 (`using (true)`) — 추후 Auth 연동 시 강화 필요
- Realtime: 세 테이블 모두 `supabase_realtime` publication에 등록

---

## 4. 개발 원칙

### 코드 스타일
- TypeScript strict 모드
- 모든 컴포넌트 최상단에 `"use client"` 추가 (App Router 기본값이 Server Component)
- 파일명: PascalCase (컴포넌트), camelCase (유틸·스토어)
- 경로 alias: `@/*` → 프로젝트 루트 (`calendar couple/`)

### 아키텍처 원칙
- **커플 데이터 격리:** 모든 데이터는 `couple_id` FK로 격리
- **실시간 동기화:** Supabase Realtime `postgres_changes` 채널 구독
- **localStorage 폴백:** Supabase 환경변수 없을 때 자동으로 로컬 스토리지 사용
- **Leaflet SSR 비호환:** `KoreaMap.tsx`는 반드시 `dynamic(..., { ssr: false })`로 임포트

### 지도 관련 핵심 사항
- 시·도 코드: `11`(서울), `21`(부산), `31`(경기), `39`(제주) 등 — GeoJSON 실제값 기준
- 광역시 코드: `11, 21~26, 29` — 구(區) 개별 유지
- 일반 시 구 통합: `mergeSimpleCityDistricts()` — 앞 4자리 그룹핑 후 @turf/union
- 방문 횟수 계산: `Set("dateFrom~dateTo")` 기준 고유 기간 수 (중복 제거)

### 보안
- 환경변수(`.env.local`)에 Supabase 키 저장 — 절대 코드에 하드코딩 금지
- `.env.local`은 git 제외 (`.gitignore` 확인)

---

## 5. UI/UX 가이드라인

- **기존 캘린더 디자인:** 웜톤 팔레트 (`--primary: #d2644a`, `--bg: #f6efe7`) + 유리 카드 스타일
- **지도 디자인:** 인디고 블루 색상 스케일 (`#FFFFFF` → `#4F46E5`), 흰 배경
- **폰트:** `Segoe UI`, `Noto Sans KR`
- **반응형:** PC 1280px 이상 기준 (모바일 대응은 추후)

---

## 6. Claude 작업 지침

- 새 기능 구현 시 `/feature-dev` 명령어로 구조화된 개발 워크플로 진행
- UI 컴포넌트 설계 시 `frontend-design` 스킬 적용
- Supabase 보안 규칙(RLS) 변경 시 반드시 사용자 확인 후 적용
- 새 Supabase 테이블 추가 시 `schema.sql` 업데이트 + 사용자에게 SQL 실행 안내
- 한국어로 답변, 코드 주석은 한국어·영어 모두 허용

---

## 7. 미구현 / TODO

- [ ] Supabase Auth 로그인 (구글 로그인) — 현재 roomCode만으로 구분
- [ ] RLS 정책 강화 (Auth 연동 후)
- [ ] 사진 업로드 (Supabase Storage)
- [ ] 후기 작성 기능
- [ ] Vercel 배포 설정
- [ ] 모바일 반응형 대응
