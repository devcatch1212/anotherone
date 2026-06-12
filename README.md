# Anotherone (NestJS & Next.js Monorepo)

이 프로젝트는 백엔드 API 서버(**NestJS**)와 프론트엔드 웹 어플리케이션(**Next.js**)을 하나의 저장소에서 개발 및 관리하는 **npm workspaces + Turborepo** 기반의 모노레포(Monorepo) 프로젝트입니다.

---

## 🛠️ 개발 환경 및 기술 스택

* **런타임**: Node.js >= 22 (LTS 권장)
* **패키지 매니저**: npm
* **모노레포 도구**: Turborepo (빌드 및 병렬 실행 오케스트레이션)
* **프론트엔드**: Next.js (App Router, TypeScript, Tailwind CSS, Zustand, MSW)
* **백엔드**: NestJS (TypeScript, Prisma ORM, JWT 인증)
* **데이터베이스**: PostgreSQL (Render 호스팅)

---

## 📂 프로젝트 폴더 구조

```text
anotherone/ (root)
├── package.json          # 루트 package.json (workspaces 정의 및 공통 스크립트)
├── turbo.json            # Turborepo 파이프라인 빌드 설정
├── render.yaml           # Render 배포 설정 (API 서버 + PostgreSQL DB)
├── apps/                 # 실제 배포/구동되는 독립 어플리케이션
│   ├── web/              # 프론트엔드 웹앱 (Next.js - Port: 3000)
│   └── api/              # 백엔드 API 서버 (NestJS - Port: 3001)
└── packages/             # 앱 간에 공유하는 공통 모듈 및 설정 패키지
    ├── db/               # Prisma 스키마 및 DB 클라이언트 패키지 (@anotherone/db)
    ├── tsconfig/         # 공통 TypeScript 설정 패키지 (@anotherone/tsconfig)
    └── types/            # 프론트/백 공통 DTO 및 데이터 타입 정의 패키지 (@anotherone/types)
```

### 각 어플리케이션 및 패키지 설명

1. **`apps/web` (Next.js)**
   * 포트 `3000`번에서 실행되는 사용자 웹 서비스 화면입니다.
   * 상태 관리는 **Zustand** + `localStorage`/`sessionStorage` persist를 사용합니다.
   * 로컬 개발 시 **MSW(Mock Service Worker)**를 사용하여 백엔드 없이 특정 기능을 개발할 수 있습니다.

2. **`apps/api` (NestJS)**
   * 포트 `3001`번에서 실행되는 백엔드 API 서버입니다.
   * **JWT** 기반 인증, **Prisma ORM**으로 DB 접근, **class-validator** 기반 요청 유효성 검사를 사용합니다.
   * 모듈 구조: `auth`, `onboarding`, `attendance`, `payroll`, `leave`, `notifications`, `settings`, `system`

3. **`packages/db`**
   * Prisma 스키마(`schema.prisma`)와 생성된 Prisma Client를 관리하는 패키지입니다.
   * 스키마 변경 후 `npx prisma generate --schema=packages/db/prisma/schema.prisma` 실행이 필요합니다.

4. **`packages/tsconfig`**
   * 프로젝트 전반에서 사용되는 TypeScript 컴파일러 설정을 한 곳에서 관리합니다 (`base.json`, `nextjs.json`, `nestjs.json`).

5. **`packages/types`**
   * 웹앱과 API 서버가 서로 통신할 때 공유하는 공통 타입을 관리하는 패키지입니다.

---

## 🚀 시작하기

### 1. 의존성 설치
루트 경로에서 패키지를 설치하면 하위 모든 어플리케이션과 공유 패키지 모듈이 링크되어 연결됩니다.
```bash
npm install
```

### 2. 환경 변수 설정

**`packages/db/.env`** (DB 연결)
```env
DATABASE_URL="postgresql://..."
```

**`apps/web/.env.local`** (프론트엔드 API 주소)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_KAKAO_APP_KEY=...
```

API 서버의 `JWT_SECRET`, `FRONTEND_URL`, `PORT` 환경 변수는 `.env` 파일 또는 배포 플랫폼 대시보드에서 설정합니다.

### 3. 개발 서버 실행 (동시 실행)
Turborepo를 사용하여 Next.js와 NestJS 개발 서버를 병렬로 즉시 가동합니다.
```bash
npm run dev
```
* **프론트엔드 웹**: [http://localhost:3000](http://localhost:3000)
* **백엔드 API**: [http://localhost:3001](http://localhost:3001)

### 4. 전체 프로젝트 빌드
프로덕션 배포용으로 모든 하위 모듈 및 애플리케이션을 빌드합니다.
```bash
npm run build
```

### 5. 코드 린트 검사
ESLint를 사용해 모든 프로젝트의 정적 코드 분석을 동시 수행합니다.
```bash
npm run lint
```

---

## 🌐 배포 구성

| 서비스 | 플랫폼 | URL |
|---|---|---|
| 프론트엔드 (Next.js) | Vercel | - |
| 백엔드 API (NestJS) | Render | `https://anotherone-tjgi.onrender.com` |
| PostgreSQL DB | Render | Singapore 리전 |

* **자동 배포**: `main` 브랜치 push 시 Render와 Vercel이 자동으로 빌드 및 배포합니다.
* **Render 필수 환경 변수**: `JWT_SECRET`, `FRONTEND_URL` (Render 대시보드에서 수동 입력)

---

## 📚 문서

* [DB 스키마](./docs/database_schema.md) — 전체 테이블 명세
* [API 명세서](./docs/api-specification.md) — 전체 엔드포인트 목록
* [급여 계산 로직](./docs/payroll-calculation.md) — 급여 정산 방식 설명
