# 숙제 1: Playwright를 적용한 GEO/scRNA 메타데이터 테스트 시나리오

## Playwright 시나리오를 녹색(통과)으로 만드는 방법

1. **프로젝트 폴더로 이동**
   ```bash
   cd 01_playwright_geo_scrna
   ```

2. **의존성 및 브라우저 설치** (최초 1회)
   ```bash
   npm install
   npx playwright install
   ```
   - `npx playwright install` 은 Chromium 등 브라우저를 받으므로 시간이 걸릴 수 있음.

3. **테스트 실행**
   ```bash
   npx playwright test
   ```
   - 터미널에서 `✓` / `passed` 가 나오면 **녹색(통과)**.
   - `npm run test` 로 실행해도 동일 (`package.json` 의 `"test": "playwright test"`).

4. **녹색 결과를 화면으로 보고 싶을 때** (HTML 리포트)
   ```bash
   npx playwright test --reporter=html
   npx playwright show-report
   ```
   - 브라우저가 열리면 통과한 테스트가 녹색 체크로 표시됨.

**정리**: `npm install` → `npx playwright install` → `npx playwright test` 순서로 하면 시나리오가 통과했을 때 터미널/리포트에서 녹색(✓)으로 보인다.

---

## 목표

GEO 통합용으로 수동 작성한 메타데이터 CSV를 활용해, **scRNA 데이터만** 대상으로 GEO 페이지에서 GSM/SRR 등 정보가 실제와 일치하는지 Playwright로 자동 검증·보조 수집합니다.

## 포함된 CSV

- `scRNA_seq_datasets_v3.csv` — scRNA 시퀀싱 데이터셋 메타데이터 (GEO/ENA/GSA 등 혼재)
- `DNA_methylation_datasets_v2.csv` — DNA 메틸화 데이터셋 메타데이터 (참고용)

시나리오는 **scRNA CSV**만 사용하며, `Accesion_url`이 `ncbi.nlm.nih.gov/geo`인 행(GEO 한정)만 필터링해 테스트합니다.

## 시나리오 요약

1. **입력**: scRNA CSV에서 `Accesion`(GSE 등), `Accesion_url`, `Sample_accesion`(GSM), `rawdata_name`(SRR) 컬럼 사용.
2. **GEO 한정**: `Accesion_url`에 `ncbi.nlm.nih.gov/geo`가 포함된 행만 대상.
3. **테스트 시나리오**:
   - GSE 시리즈 페이지 접속 → HTTP 200 및 페이지 로드 검증
   - Sample table 또는 Supplementary 파일 목록 존재 여부 검증
   - GSM 샘플 페이지에서 SRR/raw data 링크 존재 확인 또는 페이지 텍스트에서 SRR 패턴 추출
4. **보조 목적**: SRR이 비어 있거나 불확실한 행에 대해 Playwright로 페이지를 열어 SRR/raw data 링크를 찾아 메타데이터 보강용 후보를 출력.

## 폴더 구성

- `e2e/` — Playwright 스펙 (`geo-scrna.spec.ts`)
- `README.md` — 본 문서
- `RESULTS.md` — 테스트 과정·결과 요약 (통과 항목 녹색 표기)

## 실행 방법

```bash
# 의존성 설치
npm install
npx playwright install

# 테스트 실행 (headless)
npx playwright test

# HTML 리포트 생성 후 확인
npx playwright test --reporter=html
npx playwright show-report
```

## Linux 서버 / Windows 노트북 (SSH) 환경

| 환경 | 할 일 |
|------|--------|
| **Linux 서버** | `xvfb` 등으로 headless 실행. `playwright install` 후 `npx playwright test` 실행. |
| **Windows** | 저장소 클론 후 `npm i` → `npx playwright test` 실행. 또는 WSL2에서 동일하게 실행. |

테스트 결과는 `RESULTS.md`에서 확인할 수 있으며, 통과한 항목은 녹색으로 표기됩니다.

## GEO scRNA 데이터셋 목록 및 SRR 매칭·비교

- **GEO 관련 데이터셋 (scRNA_seq_datasets_v3.csv 기준)**: GSE128531, GSE130973, GSE138669, GSE150672, GSE156326, GSE165816, GSE173205, GSE175990, GSE176415, GSE180885, GSE183031, GSE195452, GSE207335, GSE207336, GSE218170, GSE274955, GSE281449 (총 17개, 466 샘플 행).
- **Playwright 수집**: `npm run collect-srr` → GSE/GSM별로 GEO 페이지에서 SRR 추출 후 `output/geo_scrna_playwright_srr.csv` 생성 (컬럼: GSE, Sample_accesion, SRR_playwright). GSE 페이지에서 쌍이 없으면 GSM 샘플 페이지 방문.
- **SRR 비교 분석**: `compare_srr_with_v3.ipynb` 실행. v3의 `rawdata_name`과 Playwright 수집 `SRR_playwright`를 GSE+Sample_accesion 기준으로 병합 후 exact_match / partial_match / missing_in_playwright / mismatch 요약 및 GSE별 일치율 출력.
- **동일 로직 스크립트**: `compare_srr_with_v3.py` (터미널에서 `python compare_srr_with_v3.py` 실행 가능).
