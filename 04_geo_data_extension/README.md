# 04_geo_data_extension — GEO Download Info Collector

GEO 시리즈(GSE) ID를 입력하면 **샘플 정보**, **Supplementary 데이터(HTTP 경로)**, **Raw 데이터(SRR, reads/spot)** 를 수집해 CSV로 내보내는 Chrome 확장 프로그램입니다.  
나중에 wget으로 보조파일을, SRA 도구로 raw를 받을 때 사용할 수 있도록 정리합니다.

---

## 어떤 일을 하나요?

| 입력 | 동작 |
|------|------|
| GSE ID (예: GSE138669) | GSE 페이지에서 샘플 목록(GSM + 이름) 수집 |
|  | 각 GSM 페이지에서 Supplementary 파일 HTTP 링크 수집 |
|  | SRA(SRX) → Run(SRR) 조회 후, Trace 페이지에서 **reads per spot**(1/2/3) 수집 |
| 출력 | CSV 1개 (wget/SRA 명령용 경로·인자 정리) |

**CSV 컬럼:** `GSE_ID`, `GSM_ID`, `Sample_Name`, `Supplementary_HTTP_Series`, `Supplementary_HTTP_Sample`, `Raw_SRR`, `Reads_Per_Spot`

---

## 폴더 구조

```
04_geo_data_extension/
├── extension/          # Chrome 확장 (로드할 폴더는 여기)
│   ├── manifest.json
│   ├── popup.html
│   └── popup.js
├── server/             # 선택) 로컬 SQLite 저장용 Flask 서버
│   ├── app.py
│   └── requirements.txt
├── scripts/
│   └── check-gse-id.js # 서버에서 GSE ID·페이지 접근 확인용
├── docs/
│   └── install-chrome-ubuntu-docker.md  # Ubuntu Docker에서 Chrome 설치 참고
└── README.md           # 이 소개 자료
```

---

## 사용 방법

1. **Chrome** → `chrome://extensions` → 개발자 모드 켜기 → **압축해제된 확장 프로그램 로드** → **`extension`** 폴더 선택  
2. 확장 아이콘 클릭 → GSE ID 입력 (예: `GSE138669` 또는 GEO 페이지 URL 붙여넣기)  
3. **Collect from GEO + SRA + Trace** 클릭 → 완료 후 **Download CSV** 로 저장  
4. (선택) 로컬 DB에 넣으려면 `server/` 에서 `pip install -r requirements.txt` 후 `python app.py` 실행 → 확장에서 **Save to SQLite via Local Server** 사용  

---

## 서버에서 확인 (선택)

GSE ID가 올바른지·페이지에 샘플이 있는지 먼저 확인하려면:

```bash
cd 04_geo_data_extension/scripts
node check-gse-id.js GSE138669
```

---

## Git 포함 작업 요약

- **저장소:** GitHub `aldas79/GEO_radar`  
- **서버(Linux)에서 수정 후 올리기:**  
  `git add .` → `git commit -m "메시지"` → `git push origin master`  
- **Windows에서 최신 받기:**  
  `cd GEO_radar` → `git pull` (또는 `git pull origin master`)  
- **확장 코드 반영:** Chrome `chrome://extensions` 에서 해당 확장 **새로고침(↻)**  

이 프로젝트는 7주 과제의 일부로, GEO 데이터 다운로드 경로를 한 번에 정리해 두기 위해 만들었습니다.
