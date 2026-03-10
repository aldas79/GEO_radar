# GEO scRNA Playwright 테스트 결과

## 요약

| 항목 | 결과 |
|------|------|
| 실행 일시 | 테스트 실행 시점 기준 |
| 총 테스트 수 | 5 (geo-scrna) + 1 (find-srr) |
| 통과 | <span style="color:green">**6**</span> |
| 실패 | 0 |

## 테스트 시나리오 및 결과

| # | 시나리오 | 결과 |
|---|----------|------|
| 1 | CSV에서 GEO 항목 존재 여부 | <span style="color:green">**PASS**</span> |
| 2 | 첫 GEO GSE 시리즈 페이지 로드 (HTTP 200, 타이틀) | <span style="color:green">**PASS**</span> |
| 3 | GSE 페이지에 Sample/GSM/Series/Supplementary 관련 내용 포함 | <span style="color:green">**PASS**</span> |
| 4 | GSE 페이지 본문에 Accession ID 포함 | <span style="color:green">**PASS**</span> |
| 5 | **과제1** GEO 샘플(GSM) 페이지 접속 → SRA 링크 클릭 → SRR 번호 노출 검증 | <span style="color:green">**PASS**</span> |
| 6 | (find-srr) 특정 GSM에서 SRR 추출 | <span style="color:green">**PASS**</span> |

## 과정 요약

1. **입력**: `scRNA_seq_datasets_v3.csv`에서 `Accesion`, `Accesion_url`, `Sample_accesion`, `rawdata_name` 컬럼 사용.
2. **필터**: `Accesion_url`에 `ncbi.nlm.nih.gov/geo`가 포함된 행만 대상으로 함.
3. **실행**: 중복 제거한 GSE URL 목록으로 첫 번째 GEO 시리즈 페이지에 접속해 로드·내용 검증.

## HTML 리포트

다음 명령으로 상세 HTML 리포트를 생성·확인할 수 있습니다.

```bash
npx playwright test --reporter=html
npx playwright show-report
```
