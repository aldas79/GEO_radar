# 숙제 3: 트립닷컴 호텔 데이터 수집 + AI 리뷰 도우미

## 목표

1. **호텔 리스트** 수집 → CSV → DB 구축  
2. **호텔 상세 페이지** 투숙객 리뷰 수집 + **AI 챗봇** (리뷰 기반 질의응답)

---

## Part A: 호텔 리스트 수집 (기존)

트립닷컴 호텔 검색 결과를 수집해 CSV로 저장하고 DB를 구축합니다.  
대량 트래픽 차단을 피하기 위해 요청 간 딜레이·동시 요청 수 제한 등 매너를 준수합니다.

## 수집 전략

1. **검색 조건 고정**: 도시·체크인/아웃 날짜 등 검색 조건을 정한 뒤 트립닷컴 호텔 검색 결과 페이지 접근.
2. **리스트 페이지**: 검색 결과에서 호텔 카드(이름, 가격, 평점, 상세 링크) 수집.
3. **상세 페이지** (선택): 필요 시 개별 호텔 상세에서 리뷰·편의시설 등 추가 수집.
4. **매너**: 요청 간 `delay`, 동시 연결 수 제한, User-Agent 명시로 차단 리스크 완화.

## Cursor 브라우저로 셀렉터 정리

1. Cursor에서 **`/`** 입력 후 **Open Browser** 선택.
2. 트립닷컴 호텔 검색 페이지를 열고, 호텔 카드·가격·평점·링크가 있는 DOM 요소를 확인.
3. 각 요소의 셀렉터(예: `data-testid`, `class`, `aria-label`)를 문서에 기록하고, 수집 스크립트에 반영.

이렇게 하면 구조 변경 시에도 셀렉터를 빠르게 수정할 수 있습니다.

## CSV 스키마 (제안)

| 컬럼 | 설명 |
|------|------|
| `hotel_id` | 호텔 고유 식별자 (URL 또는 사이트 ID) |
| `name` | 호텔 이름 |
| `price` | 표시 가격 (문자열 또는 숫자) |
| `rating` | 평점 |
| `location` | 위치/주소 |
| `url` | 상세 페이지 URL |
| `collected_at` | 수집 일시 (ISO 8601) |

필요 시 `reviews_count`, `amenities` 등 확장 가능.

## DB 스키마 (제안)

SQLite 예시:

```sql
CREATE TABLE hotels (
  hotel_id TEXT PRIMARY KEY,
  name TEXT,
  price TEXT,
  rating REAL,
  location TEXT,
  url TEXT,
  collected_at TEXT
);
```

PostgreSQL을 쓸 경우 타입만 적절히 바꾸면 됩니다.

## Part B: 호텔 상세 페이지 — AI 리뷰 도우미 (확장 프로그램)

호텔 상세 페이지 URL(예: `https://kr.trip.com/hotels/detail/?...hotelId=8899814...`)에 접속하면 오른쪽 하단에 **플로팅 봇**이 나타납니다.

### 1단계: 리뷰 수집
- 투숙객 리뷰를 **최신순** 정렬 후 수집
- 페이징을 눌러 **최대 100개** 리뷰 수집
- 수집 속성: 날짜, 작성자, 본문, 객실/방 관련 키워드(roomHint)

### 2단계: AI 질의
- 수집한 리뷰 **기반으로만** Gemini가 답변
- 모델: `gemini-2.5-flash-lite`
- API 키: `server/.env`의 `GEMINI_API_KEY`
- context 초과 시 자동 요약·축소

### 폴더 구성
- `extension/` — Chrome 확장 (플로팅 봇, 리뷰 수집, 채팅 UI)
- `server/` — Gemini API 프록시 (Express, `.env`에서 키 로드)

### 실행 방법
```bash
# 1) 서버 (Gemini API)
cd server
cp .env.example .env   # GEMINI_API_KEY 입력
npm install
npm start

# 2) Chrome 확장
# chrome://extensions → 개발자 모드 → 압축해제된 확장 로드 → extension 폴더 선택

# 3) Trip.com 호텔 상세 페이지 접속 후 플로팅 봇 사용
```

---

## 폴더 구성 (전체)

- `README.md` — 본 문서
- `scripts/collect.js` — Playwright 호텔 리스트 수집, CSV 저장 (delay·매너 준수)
- `scripts/csv-to-db.js` — CSV → SQLite 삽입
- `scripts/setup-db.js` — (선택) DB 테이블만 먼저 생성
- `schema/hotels.sql` — DB 테이블 정의
- `output/` — 수집 후 생성되는 CSV 및 `hotels.db`
- `extension/` — 호텔 상세 페이지 AI 리뷰 도우미 (Chrome 확장)
- `server/` — Gemini API 프록시

## 실행 방법

```bash
# 의존성 설치
npm install
npx playwright install

# 1) 호텔 리스트 수집 → output/hotels_<timestamp>.csv
npm run collect

# 2) CSV → SQLite (가장 최신 CSV 사용, 또는 파일 경로 지정)
npm run csv-to-db
# 또는
node scripts/csv-to-db.js output/hotels_1234567890.csv

# (선택) 테이블만 먼저 생성
npm run setup-db
```

검색 조건(도시, 체크인/아웃)은 `scripts/collect.js` 상단 `SEARCH` 객체에서 수정할 수 있습니다.

## Linux 서버 / Windows 노트북 (SSH) 환경

| 환경 | 할 일 |
|------|--------|
| **Linux 서버** | Playwright/Puppeteer headless로 수집 스크립트 실행. SQLite/PostgreSQL 설치 후 DB 구축. |
| **Windows** | 결과만 확인하려면 CSV/DB 파일을 SCP로 가져오거나, 서버에 Jupyter/간단한 API를 두고 원격 접속. |

수집 스크립트는 Linux 서버에서 headless로 실행하는 구성을 권장합니다.
