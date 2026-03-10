# GEO scRNA 데이터셋 목록 및 SRR 매칭·비교

## 1. GEO 관련 scRNA 데이터셋 (v3 기준)

`scRNA_seq_datasets_v3.csv`에서 `Accesion_url`에 `ncbi.nlm.nih.gov/geo`가 포함된 행만 필터한 데이터셋(GSE) 목록:

- **GSE128531**, **GSE130973**, **GSE138669**, **GSE150672**, **GSE156326**, **GSE165816**, **GSE173205**, **GSE175990**, **GSE176415**, **GSE180885**, **GSE183031**, **GSE195452**, **GSE207335**, **GSE207336**, **GSE218170**, **GSE274955**, **GSE281449**
- **총 17개 GSE, 466 샘플 행**

## 2. Playwright로 샘플–SRR 매칭 수집

- **실행**: `npm run collect-srr` (프로젝트 루트 `01_playwright_geo_scrna`에서)
- **동작**: 각 GSE 시리즈 페이지 접속 → 페이지에서 GSM·SRR 쌍 추출. 추출 실패 시 각 GSM 샘플 페이지 방문해 SRR 추출.
- **출력**: `output/geo_scrna_playwright_srr.csv`  
  컬럼: `GSE`, `Sample_accesion`, `SRR_playwright`
- **빠른 테스트**: `LIMIT_GSE=2 npm run collect-srr` (처음 2개 GSE만 수집)

## 3. v3와 SRR 비교 분석 (주피터 노트북)

- **노트북**: `compare_srr_with_v3.ipynb`
- **내용**:  
  - v3 CSV의 GEO 행(`rawdata_name`)과 Playwright 수집 CSV(`SRR_playwright`)를 **GSE + Sample_accesion** 기준으로 병합  
  - 비교 결과: `exact_match` / `partial_match` / `missing_in_playwright` / `mismatch` / `both_empty`  
  - 요약 통계, 불일치 샘플 표, GSE별 일치율
- **실행**: 노트북을 `01_playwright_geo_scrna` 디렉터리에서 열고 셀 순서대로 실행. (또는 `python compare_srr_with_v3.py`로 동일 비교 로직 실행)

## 4. 파일 구성

| 파일 | 설명 |
|------|------|
| `scRNA_seq_datasets_v3.csv` | 원본 메타데이터 (GEO 포함) |
| `output/geo_scrna_playwright_srr.csv` | Playwright 수집 GSE/GSM/SRR |
| `compare_srr_with_v3.ipynb` | SRR 일치 비교 분석 |
| `compare_srr_with_v3.py` | 비교 로직 스크립트 버전 |
| `scripts/collect-gsm-srr.js` | Playwright 수집 스크립트 |
