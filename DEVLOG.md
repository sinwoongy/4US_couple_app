# 4US 개발 로그

커플 공유 앱 4US의 개발 히스토리를 기록합니다.
버전 태그는 git tag 기준 (`git tag`, `git checkout v1.0` 으로 롤백 가능).

---

## v1.0 — 첫 배포 (2026-08-13)

### 확정 기술 스택
| 역할 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 언어 | TypeScript (strict) |
| 스타일링 | Tailwind CSS v4 + Pure CSS 혼용 |
| DB / 실시간 | Supabase (PostgreSQL + Realtime) |
| 지도 | Leaflet + react-leaflet (SSR: false) |
| 지도 데이터 | GeoJSON (southkorea-maps, 통계청 2012) |
| 폴리곤 합치기 | @turf/union v7 |
| 호스팅 | Vercel (GitHub 연동, main 푸시 시 자동 배포) |

### 구현된 기능

#### 캘린더 탭
- 커플 코드 `4us-minji` 고정 (환경변수 `NEXT_PUBLIC_COUPLE_CODE`)
- 기념일·파트너 이름 저장 (couples 테이블)
- 일정 추가·수정·삭제 (events 테이블)
- Supabase Realtime `postgres_changes` 실시간 동기화
- localStorage 폴백 (Supabase 환경변수 없을 때)

#### 여행 지도 탭
- 한국 시·도 드릴다운 → 시·군·구 선택
- 방문 횟수별 인디고 블루 색상 스케일 (`#FFFFFF` → `#4F46E5`)
- 지역명 상시 라벨 (3회 이상 방문 시 흰색 텍스트)
- 일반 시(市) 구(區) 폴리곤 통합 — `mergeSimpleCityDistricts()` (@turf/union v7)
  - 대상: 수원, 성남, 안양, 부천, 안산, 고양, 용인, 청주, 천안, 전주, 포항, 창원
  - 광역시(서울·부산 등) 구는 개별 유지
- 방문 횟수 중복 방지 — `Set("dateFrom~dateTo")` 기준 고유 기간 집계
- 지도 이동 범위 제한 (`maxBounds`, `minZoom: 7`)
- 여행 기록 추가·수정·삭제 (trips 테이블)
  - 날짜/기간, 장소, 먹은 것, 소감, 별점(1~5), 태그
  - 장소 클릭 → 네이버 지도 새 탭 검색
- Supabase Realtime 동기화 + 뮤테이션 후 즉시 재조회 폴백

### 주요 트러블슈팅
- **Tailwind v4 Turbopack 미지원**: PostCSS 플러그인 미처리로 유틸리티 클래스 미적용 → `.map-*` CSS 클래스 직접 정의로 해결
- **폴더명 공백 오류**: `calendar couple` → `calendar-couple` 이름 변경 (Vercel Serverless Function 경로 공백 불허)
- **Supabase URL 이중 경로**: 환경변수에 `/rest/v1` 포함 시 요청 URL 중복 → URL만 입력하도록 수정
- **couple 행 자동 생성**: `getCoupleId` 단순 조회에서 `ensureAndGetCoupleId`로 교체 (없으면 생성)

### Supabase 스키마
- `couples`: id, invite_code, partner_one_name, partner_two_name, anniversary_date
- `events`: id, couple_id, title, date, note, color, all_day, start_time, end_time
- `trips`: id, couple_id, sido, sido_code, sigungu, sigungu_code, date_from, date_to, places, food, impression, rating, tags, created_by
- RLS: 전체 공개 정책 (추후 Auth 연동 시 강화 예정)
- Realtime: 세 테이블 모두 `supabase_realtime` publication 등록

---

## 미구현 / 다음 작업 예정

- [ ] Supabase Auth (구글 로그인) + RLS 강화
- [ ] 사진 업로드 (Supabase Storage)
- [ ] 후기 작성 기능
- [ ] 모바일 반응형 대응
- [ ] PWA 설정 (홈 화면 아이콘, 주소창 없이 앱처럼 실행)

---

## 롤백 방법

```bash
# 버전 목록 확인
git tag

# 특정 버전 코드 확인 (파일 변경 없이 조회만)
git show v1.0

# 특정 버전으로 롤백
git checkout v1.0

# 최신으로 돌아오기
git checkout main
```
