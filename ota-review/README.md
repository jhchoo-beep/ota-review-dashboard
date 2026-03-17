# OTA 리뷰 대시보드

아고다 / 에어비앤비 리뷰 점수를 지점별로 입력·관리하는 내부 대시보드입니다.

## 기술 스택
- **프론트엔드**: Next.js 14 + React 18
- **백엔드 API**: Next.js API Routes
- **데이터베이스**: Vercel Postgres (PostgreSQL)
- **배포**: Vercel

---

## 배포 순서 (처음 1회)

### 1단계 — GitHub 업로드

1. [github.com](https://github.com) 에서 새 repository 생성 (예: `ota-review-dashboard`)
2. 이 폴더의 파일 전체를 올리기

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/내계정/ota-review-dashboard.git
git push -u origin main
```

---

### 2단계 — Vercel 배포

1. [vercel.com](https://vercel.com) 접속 → GitHub 계정으로 가입/로그인
2. **Add New Project** → 위에서 만든 repo 선택 → **Deploy**
3. 배포 완료 → `https://프로젝트명.vercel.app` URL 생성

---

### 3단계 — Vercel Postgres DB 생성

1. Vercel 대시보드 → 프로젝트 선택 → **Storage** 탭
2. **Create Database** → **Postgres** 선택 → 이름 입력 → Create
3. DB 생성 완료되면 **Connect** 클릭
4. `.env.local` 탭에서 환경 변수가 자동으로 프로젝트에 연결됨

---

### 4단계 — DB 테이블 초기화 (최초 1회)

Vercel 대시보드 → Storage → Postgres → **Query** 탭에서 아래 SQL 실행:

```sql
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  platform VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  review_count INTEGER,
  overall_score NUMERIC(3,1),
  cleanliness NUMERIC(3,1),
  facilities NUMERIC(3,1),
  location NUMERIC(3,1),
  service NUMERIC(3,1),
  value_for_money NUMERIC(3,1),
  response_rate NUMERIC(5,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, recorded_at)
);

INSERT INTO properties (name, platform) VALUES
  ('신설 만그로브', 'agoda'),
  ('동대문 만그로브', 'airbnb')
ON CONFLICT (name) DO NOTHING;
```

---

### 5단계 — 완료!

사이트 접속 후 좌측 지점 선택 → **점수 입력** 탭 → 입력 후 저장.

---

## 지점 추가 방법

웹사이트 좌측 하단 **+ 지점 추가** 버튼 클릭 → 지점명 + 플랫폼 선택 → 추가.

---

## 로컬 개발

```bash
npm install
# .env.local 파일에 Vercel Postgres 환경변수 붙여넣기
npm run dev
# http://localhost:3000
```
