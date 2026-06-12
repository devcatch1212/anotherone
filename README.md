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

---

## 📅 연차 계산 방식 및 기준

본 프로젝트는 **근로기준법 시행령 제9조 [별표 2] (단시간근로자의 근로조건 결정기준)**에 의거하여 단시간 및 초단시간 근로자의 연차유급휴가를 비례 산정하여 시스템에 반영하고 있습니다.

### 1. 초단시간 근로자 (주 소정근로시간 15시간 미만)
* **기준**: 근로기준법 제18조 제3항에 따라 4주 동안을 평균하여 1주 동안의 소정근로시간이 15시간 미만인 근로자에게는 연차유급휴가(제60조)가 적용되지 않습니다.
* **적용**: 시스템상에서 발생 연차 및 남은 연차가 **0일(0시간)**로 표시되며, 휴가 신청이 불가능합니다.

### 2. 단시간 근로자 (주 소정근로시간 15시간 이상)
* **기준**: 통상 근로자(주 40시간 근무)의 기준 연차 일수(15일)를 바탕으로 본인의 주 소정근로시간에 비례하여 시간 단위로 연차를 계산합니다.
* **산정 공식**:
  * **발생 연차 시간(h)** = $15\text{일} \times \left(\frac{\text{본인의 주 소정근로시간}}{40\text{시간}}\right) \times 8\text{시간}$
  * **부여 연차 일수(일)** = $\text{발생 연차 시간(h)} \div \text{본인의 1일 소정근로시간}$
  * *참고: 본 서비스는 연차 사용 및 차감 시 시간 단위 처리가 가능하도록 연차 시간(h)과 일(day) 단위를 병기하여 관리합니다.*

### 3. 대표 근로 형태별 연차 산정 비교표

| 구분 | 주 소정근로시간 | 1일 근로시간 (근무일수) | 발생 연차 시간 | 부여 연차 일수 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **통상 근로자** | 40시간 | 8시간 (주 5일) | 120시간 | **15일** | 기준 근로자 |
| **단시간 근로자 A** | 24시간 | 8시간 (주 3일) | 72시간 | **9일** | 예: 화, 수, 금 9시~18시 |
| **단시간 근로자 B** | 15시간 | 5시간 (주 3일) | 45시간 | **9일** | 비례 산정 적용 |
| **초단시간 근로자** | 12시간 | 4시간 (주 3일) | 0시간 | **0일** | 연차 적용 제외 |

