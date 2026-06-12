# @anotherone/web — Next.js 프론트엔드

근무관리 시스템의 웹 클라이언트입니다. Next.js App Router + TypeScript 구조로 구성되어 있으며, Vercel에 배포됩니다.

---

## 🗂️ 페이지 구조

| 경로 | 설명 |
|---|---|
| `/` | 스플래시 (인증 상태에 따라 자동 리다이렉트) |
| `/login` | 로그인 |
| `/login/register` | 회원가입 |
| `/onboarding/wage-type` | 온보딩 — 급여 형태 선택 |
| `/onboarding/complete` | 온보딩 — 회사·근로계약 등록 완료 |
| `/home` | 홈 (출퇴근 체크인/체크아웃, 당월 근무 현황) |
| `/attendance` | 출근 기록 캘린더/목록 |
| `/calendar` | 캘린더 (출근·휴가 일정 통합) |
| `/payroll` | 급여명세서 목록 |
| `/payroll/[id]` | 급여명세서 상세 |
| `/leave` | 휴가 현황 |
| `/leave/apply` | 휴가 신청 |
| `/notifications` | 알림 |
| `/settings` | 설정 |
| `/settings/profile` | 프로필·근로정보 수정 |
| `/settings/privacy` | 개인정보처리방침 |
| `/settings/terms` | 이용약관 |

---

## ⚙️ 환경 변수

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_KAKAO_APP_KEY=your_kakao_app_key
```

| 변수명 | 설명 |
|---|---|
| `NEXT_PUBLIC_API_URL` | 백엔드 API Base URL |
| `NEXT_PUBLIC_KAKAO_APP_KEY` | Kakao 지도 API 키 (주소 검색에 사용) |

---

## 🚀 로컬 실행

```bash
# 루트에서 실행 (권장 — API 서버와 동시 실행)
npm run dev

# 또는 이 디렉토리에서 단독 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

---

## 🎭 MSW (Mock Service Worker)

로컬 개발 환경에서만 활성화됩니다 (`NODE_ENV=development`).
`src/mocks/handlers/index.ts`에서 활성화된 핸들러 목록을 관리합니다.

현재 MSW로 처리되는 API:
- `GET /api/notifications` — 알림 목록 (배포 환경에서는 실제 DB 사용)

---

## 🏗️ 빌드

```bash
npm run build
```

---

## 📚 관련 문서

* [API 명세서](../../docs/api-specification.md)
* [DB 스키마](../../docs/database_schema.md)
