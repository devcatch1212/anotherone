# @anotherone/api — NestJS 백엔드

근무관리 시스템의 REST API 서버입니다. NestJS + Prisma ORM + JWT 인증 구조로 구성되어 있으며, Render에 배포됩니다.

---

## 🗂️ 모듈 구조

| 모듈 | 경로 | 설명 |
|---|---|---|
| `AuthModule` | `src/auth/` | 회원가입, 로그인, JWT 발급/검증 |
| `OnboardingModule` | `src/onboarding/` | 최초 회사·근로계약 등록 |
| `AttendanceModule` | `src/attendance/` | 출퇴근 체크인/체크아웃, 초과근무 신청 |
| `PayrollModule` | `src/payroll/` | 월별 급여 자동 정산 및 명세서 조회 |
| `LeaveModule` | `src/leave/` | 휴가 신청 및 내역 조회 |
| `NotificationsModule` | `src/notifications/` | 알림 조회 및 읽음 처리 |
| `SettingsModule` | `src/settings/` | 프로필/비밀번호 변경, 회원탈퇴, 근로종료 |
| `SystemModule` | `src/system/` | 앱 설정(버전/점검), 약관·개인정보 조회 |
| `PrismaModule` | `src/prisma/` | DB 연결 및 PrismaService 글로벌 제공 |

---

## ⚙️ 환경 변수

`.env` 또는 Render 대시보드에서 설정:

| 변수명 | 설명 | 예시 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | JWT 서명 시크릿 키 | 랜덤 문자열 |
| `FRONTEND_URL` | CORS 허용 프론트엔드 URL | `https://your-app.vercel.app` |
| `PORT` | 서버 포트 (기본값: 3001) | `3001` |

---

## 🚀 로컬 실행

```bash
# 루트에서 실행 (권장)
npm run dev

# 또는 이 디렉토리에서 단독 실행
npm run start:dev
```

서버가 `http://localhost:3001`에서 실행됩니다.

헬스체크: `GET http://localhost:3001/api/health`

---

## 🏗️ 빌드 및 실행

```bash
# 빌드
npm run build

# 프로덕션 실행
node dist/main.js
```

---

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# e2e 테스트
npm run test:e2e

# 커버리지
npm run test:cov
```

---

## 📚 관련 문서

* [API 명세서](../../docs/api-specification.md)
* [DB 스키마](../../docs/database_schema.md)
* [급여 계산 로직](../../docs/payroll-calculation.md)
