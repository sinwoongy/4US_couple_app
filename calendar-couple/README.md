# COUPLE_CALENDAR_WEB

실시간으로 커플 일정과 기념일을 함께 공유할 수 있는 커플 캘린더 웹 프로젝트입니다.  
같은 커플 코드를 입력한 사용자가 같은 공간에 접속해서 기념일과 일정을 함께 관리할 수 있도록 구성되어 있습니다.

## 프로젝트 개요

- 프레임워크: Next.js App Router
- 언어: TypeScript
- 데이터 동기화: Supabase
- 대체 저장소: `localStorage`

Supabase 환경 변수가 설정되어 있으면 실시간 동기화가 동작하고, 설정이 없더라도 브라우저 로컬 저장소를 이용해 기본 동작을 확인할 수 있습니다.

## 현재 구현된 주요 기능

- 커플 코드 입력 및 저장
- 커플 기본 정보 입력
  - 이름 2개
  - 기념일
- D-Day 계산 및 표시
- 공유 일정 생성
- 공유 일정 삭제
- 월간 캘린더 UI 표시
- 선택 날짜 일정 목록 표시
- 날짜 클릭 시 `Quick Add` 미니 창으로 바로 일정 작성
- Supabase Realtime 기반 동기화
- Supabase 미설정 시 `localStorage` 대체 동작

자세한 구현 상태는 [FEATURE_CHECKLIST.md](/C:/Users/user/Desktop/Sandbox_AI_project/Couple_calendar_web/FEATURE_CHECKLIST.md:1)에서 볼 수 있습니다.

## 실행 방법

프로젝트 루트에서 아래 명령어를 실행합니다.

```bash
npm install
npm run dev
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:3000
```

## 환경 변수

`.env.example`를 참고해서 `.env.local`을 설정합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Supabase가 연결되면 커플 정보와 일정이 DB에 저장되고, 같은 커플 코드로 접속한 브라우저 간 변경 사항이 실시간으로 반영됩니다.

## 데이터 구조

Supabase 스키마는 [supabase/schema.sql](/C:/Users/user/Desktop/Sandbox_AI_project/Couple_calendar_web/supabase/schema.sql:1)에 있습니다.

- `couples`
  - 커플 코드
  - 파트너 이름 2개
  - 기념일
  - 수정 시각
- `events`
  - 커플 ID
  - 일정 제목
  - 일정 날짜
  - 메모
  - 색상
  - 종일 여부
  - 시작 시간 / 종료 시간
  - 생성 시각

현재 정책은 데모와 개발 편의를 위한 공개형 정책 상태이고, 실제 서비스 전환 시에는 인증과 권한 정책 보강이 필요합니다.

## 프로젝트 구조

```text
app/
  layout.tsx            공통 레이아웃
  page.tsx              메인 페이지
  loading.tsx           로딩 UI
  error.tsx             에러 UI

components/
  couple-dashboard.tsx  메인 대시보드 UI

lib/
  couple-store.ts       Supabase 및 대체 저장소 동기화 로직
  date-utils.ts         날짜 포맷 및 달력 계산 유틸
  holiday-utils.ts      공휴일 표시 유틸
  supabase.ts           브라우저용 Supabase 클라이언트
  types.ts              공통 타입

supabase/
  schema.sql            DB 스키마 및 정책
```

## 현재 동작 방식

1. 사용자가 커플 코드를 입력합니다.
2. 해당 코드를 기준으로 커플 공간을 조회하거나 생성합니다.
3. 커플 정보와 일정을 불러와 화면에 표시합니다.
4. 일정이나 커플 정보가 변경되면 실시간 채널로 다시 동기화합니다.
5. Supabase 설정이 없으면 브라우저 `localStorage`를 이용해 동일한 흐름으로 동작합니다.

## 참고 사항

- 현재 일부 기능은 데모 성격에 가깝고, 인증 없이 커플 코드 기반으로 공유됩니다.
- 실제 배포 전에는 보안 정책, 인증, 테스트, 운영 환경 정리가 필요합니다.
- 다음 우선 작업은 깨진 문구 복구 이후 일정 수정 기능과 피드백 UI 개선입니다.
