# Anotherone (NestJS & Next.js Monorepo)

이 프로젝트는 백엔드 API 서버(**NestJS**)와 프론트엔드 웹 어플리케이션(**Next.js**)을 하나의 저장소에서 개발 및 관리하는 **npm workspaces + Turborepo** 기반의 모노레포(Monorepo) 프로젝트입니다.

---

## 🛠️ 개발 환경 및 기술 스택

* **런타임**: Node.js >= 22 (LTS 권장)
* **패키지 매니저**: npm
* **모노레포 도구**: Turborepo (빌드 및 병렬 실행 오케스트레이션)
* **프론트엔드**: Next.js (App Router, Tailwind CSS, TypeScript)
* **백엔드**: NestJS (TypeScript)

---

## 📂 프로젝트 폴더 구조

```text
anotherone/ (root)
├── package.json          # 루트 package.json (workspaces 정의 및 공통 스크립트)
├── turbo.json            # Turborepo 파이프라인 빌드 설정
├── apps/                 # 실제 배포/구동되는 독립 어플리케이션
│   ├── web/              # 프론트엔드 웹앱 (Next.js - Port: 3000)
│   └── api/              # 백엔드 API 서버 (NestJS - Port: 4000)
└── packages/             # 앱 간에 공유하는 공통 모듈 및 설정 패키지
    ├── tsconfig/         # 공통 TypeScript 설정 패키지 (@anotherone/tsconfig)
    └── types/            # 프론트/백 공통 DTO 및 데이터 타입 정의 패키지 (@anotherone/types)
```

### 각 어플리케이션 및 패키지 설명

1. **`apps/web` (Next.js)**
   * 포트 `3000`번에서 실행되는 사용자 웹 서비스 화면입니다.
   * `packages/types`로부터 백엔드 API 규격 및 도메인 모델 타입을 공유받아 일관성 있는 타입 추론이 가능합니다.

2. **`apps/api` (NestJS)**
   * 포트 `4000`번에서 실행되는 백엔드 API 서버입니다. (포트 충돌을 막기 위해 3000 대신 4000을 사용합니다.)
   * API 설계 과정에서 프론트엔드로 내보낼 Response 및 Entity 스펙을 `packages/types`에 작성하여 공유합니다.

3. **`packages/tsconfig`**
   * 프로젝트 전반에서 사용되는 TypeScript 컴파일러 설정을 한 곳에서 관리합니다 (`base.json`, `nextjs.json`, `nestjs.json`).

4. **`packages/types`**
   * 웹앱과 API 서버가 서로 통신할 때 공유하는 공통 타입을 관리하는 패키지입니다 (`/src/index.ts` 참고).

---

## 🚀 시작하기

### 1. 의존성 설치
루트 경로에서 패키지를 설치하면 하위 모든 어플리케이션과 공유 패키지 모듈이 링크되어 연결됩니다.
```bash
npm install
```

### 2. 개발 서버 실행 (동시 실행)
Turborepo를 사용하여 Next.js와 NestJS 개발 서버를 병렬로 즉시 가동합니다.
```bash
npm run dev
```
* **프론트엔드 웹**: [http://localhost:3000](http://localhost:3000)
* **백엔드 API**: [http://localhost:4000](http://localhost:4000)

### 3. 전체 프로젝트 빌드
프로덕션 배포용으로 모든 하위 모듈 및 애플리케이션을 빌드합니다.
```bash
npm run build
```

### 4. 코드 린트 검사
ESLint를 사용해 모든 프로젝트의 정적 코드 분석을 동시 수행합니다.
```bash
npm run lint
```
