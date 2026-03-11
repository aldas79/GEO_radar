# 7주 과제: 작동 확인 → Git 설정 가이드

Windows 노트북에서 SSH로 Linux 서버에 접속해 작업 중일 때, **먼저 확장 프로그램이 잘 동작하는지 확인**하고, **이후 Git으로 버전 관리**하는 방법을 단계별로 정리했습니다.

---

## Part 1. 작동 확인 (Windows에서 확장 프로그램 테스트)

확장 프로그램은 **Chrome에서만** 실행되므로, **Windows 노트북의 Chrome**에서 테스트해야 합니다. 코드는 Linux에 있으므로 아래 둘 중 하나로 Windows로 가져옵니다.

### 방법 A: Git 없이 한 번만 확인 (scp로 폴더 복사)

1. **Windows에서 폴더 받기**
   - PowerShell 또는 명령 프롬프트에서:
   ```powershell
   # 예: 사용자명 khk, Linux 서버 주소가 192.168.1.100 인 경우
   scp -r khk@192.168.1.100:/home/khk/2601_vibecoding/7_week_homework/04_geo_data_extension C:\Users\본인사용자명\Desktop\
   ```
   - 또는 WinSCP, FileZilla 등으로 `04_geo_data_extension` 폴더 전체를 Windows(예: 바탕화면)로 복사합니다.

2. **Chrome에서 확장 로드**
   - Chrome 주소창에 `chrome://extensions` 입력 후 Enter.
   - 우측 상단 **개발자 모드** 켜기.
   - **압축해제된 확장 프로그램을 로드합니다** 클릭.
   - `04_geo_data_extension` **안의** `extension` 폴더를 선택합니다.  
     (경로 예: `C:\Users\본인사용자명\Desktop\04_geo_data_extension\extension`)
   - 로드되면 퍼즐 아이콘 옆에 "GEO Download Info Collector"가 보입니다.

3. **동작 테스트**
   - 확장 아이콘 클릭 → GSE ID에 `GSE138669` 입력.
   - **Collect from GEO + SRA + Trace** 클릭.
   - 로그에 "Fetching GSE...", "Found N samples...", "Done. N rows" 등이 나오는지 확인.
   - **Download CSV** 클릭 → `geo_download_info_GSE138669.csv`가 다운로드되는지, 열어서 컬럼(GSE_ID, GSM_ID, Sample_Name, Supplementary_HTTP_Series, Supplementary_HTTP_Sample, Raw_SRR, Reads_Per_Spot)과 데이터가 있는지 확인.

4. **(선택) 로컬 DB 저장 테스트**
   - Windows에서 Python 설치 후:
   ```powershell
   cd C:\Users\본인사용자명\Desktop\04_geo_data_extension\server
   pip install -r requirements.txt
   python app.py
   ```
   - 확장에서 수집 후 **Save to SQLite via Local Server** 클릭 → 로그에 "Saved. Inserted: N" 나오면 성공.

이렇게 하면 **Git 없이** “한 번 잘 돌아가는지”만 먼저 확인할 수 있습니다.

---

### 방법 B: Git 사용 (나중에 Part 2 적용 후)

Part 2에서 저장소를 만들고 Windows에서 `git clone` 한 뒤, 위 2~4번과 동일하게 **같은 경로만** clone된 폴더 기준으로 하면 됩니다.  
예: `C:\Users\본인사용자명\projects\7_week_homework\04_geo_data_extension\extension` 로드.

---

### 방법 C: 서버에 Chrome이 있을 때 — 서버 크롬을 Windows에서 보면서 쓰기

서버(Linux)에 Chrome 또는 Chromium이 설치되어 있다면, **확장 프로그램을 서버 경로 그대로** 로드해서 쓸 수 있습니다.  
다만 Chrome은 서버에서 실행되므로, **화면(디스플레이)** 을 Windows로 넘겨줘야 “연결해서 보면서” 사용할 수 있습니다.  
방식은 크게 두 가지입니다.

| 방식 | 요약 | 장점 | 단점 |
|------|------|------|------|
| **X11 포워딩** | SSH 접속 시 `-X`로 GUI를 Windows로 전달 | 설정 간단, Chrome 창만 전달 | Windows에 X 서버 필요, 느릴 수 있음 |
| **VNC** | 서버에 가상 디스플레이 + VNC 서버 실행 후, Windows에서 VNC 클라이언트로 접속 | 전체 데스크톱 사용 가능, 안정적 | 서버에 VNC 서버 설치·설정 필요 |

---

#### C-1. X11 포워딩으로 서버 Chrome 연결

**동작:** SSH로 접속할 때 “X11 포워딩”을 켜면, 서버에서 실행한 GUI 프로그램(Chrome 등)의 **창이 Windows 쪽에** 뜹니다. Chrome은 서버에서 돌고, 화면만 Windows로 전달되는 형태입니다.

1. **Windows에 X 서버 설치 (한 번만)**  
   다음 중 하나를 설치합니다.
   - **VcXsrv** (권장): https://sourceforge.net/projects/vcxsrv/  
   - **MobaXterm** (SSH + X 서버 통합): https://mobaxterm.mobatek.net/  
   - **WSL2 + WSLg** 사용 중이면 별도 X 서버 없이 WSL에서 X 앱 가능 (서버 SSH는 Windows 터미널에서 할 경우).

2. **X 서버 실행 (VcXsrv 예시)**  
   - “XLaunch” 실행 → “Multiple windows” → “Start no client” → “Disable access control” 체크 후 Finish.  
   - (MobaXterm은 터미널만 열면 X 서버가 같이 켜짐.)

3. **SSH 접속 시 X11 포워딩 사용**  
   - Windows PowerShell/명령 프롬프트에서:
   ```powershell
   ssh -X khk@서버IP주소
   ```
   또는 `~/.ssh/config`에 해당 호스트에 `ForwardX11 yes` 설정 후 일반대로 `ssh khk@서버IP` 로 접속.

4. **서버에서 Chrome/Chromium 실행**  
   - SSH로 접속한 터미널에서:
   ```bash
   # Chromium (우분투 등)
   chromium-browser
   # 또는 Google Chrome이 설치된 경우
   google-chrome
   ```
   - Chrome 창이 **Windows 화면**에 뜨면 성공.

5. **확장 프로그램 로드**  
   - 서버의 Chrome에서 `chrome://extensions` → 개발자 모드 → “압축해제된 확장 프로그램을 로드합니다”  
   - **서버의 경로**를 그대로 입력:
   ```text
   /home/khk/2601_vibecoding/7_week_homework/04_geo_data_extension/extension
   ```
   - 이렇게 하면 **코드를 Windows로 복사하지 않고** 서버에 있는 그 경로로 확장을 씁니다.

6. **테스트**  
   - Part 1의 3번처럼 GSE 입력 → Collect → CSV 다운로드.  
   - 다운로드된 파일은 **서버의 다운로드 디렉터리**에 저장됩니다 (예: `~/Downloads`). 필요하면 `scp`로 Windows로 가져오면 됩니다.

**주의:**  
- `DISPLAY`가 설정되어 있어야 합니다. `ssh -X`로 들어오면 보통 자동 설정됨.  
- “cannot open display” 나오면 Windows 측 X 서버가 떠 있는지, 방화벽이 막고 있지 않은지 확인.

---

#### C-2. VNC로 서버 데스크톱에 접속해 Chrome 사용

**동작:** 서버에 가상 디스플레이와 VNC 서버를 띄우고, Windows에서 VNC 클라이언트로 접속해 **서버의 전체 화면**을 봅니다. 그 화면 안에서 Chrome을 실행하고 확장을 로드하면 됩니다.

1. **서버(Linux)에 VNC 서버 설치**  
   - 예 (Ubuntu/Debian):
   ```bash
   sudo apt update
   sudo apt install tigervnc-standalone-server
   ```
   - 처음 실행 시 `vncpasswd`로 비밀번호 설정.

2. **가상 디스플레이에서 데스크톱 + Chrome 실행**  
   - VNC 서버를 1번 디스플레이(예: `:1`)로 띄우고, 그 세션에 들어가서:
   ```bash
   # 필요한 경우 데스크톱 환경 설치 (예: XFCE)
   # sudo apt install xfce4 xfce4-goodies
   # 그 다음 vncserver 실행 시 startxfce4 등 지정
   vncserver :1 -geometry 1280x720
   ```
   - VNC 세션에 로그인한 뒤 터미널에서 `chromium-browser` 또는 `google-chrome` 실행.

3. **Windows에서 VNC 클라이언트로 접속**  
   - RealVNC, TigerVNC 클라이언트, 또는 MobaXterm 내장 VNC로  
     `서버IP주소:5901` (디스플레이 :1 이면 포트 5901) 접속.  
   - 서버 데스크톱이 보이면, 그 안에서 Chrome을 열고  
     `chrome://extensions` → 압축해제된 확장 로드 →  
     `/home/khk/2601_vibecoding/7_week_homework/04_geo_data_extension/extension` 지정.

4. **테스트**  
   - Part 1과 동일하게 GSE 입력 → Collect → CSV 다운로드.  
   - 파일은 서버에 저장되므로 필요 시 `scp`로 Windows로 복사.

---

#### 정리: “서버 크롬을 연결”한다는 의미

- **가능한 것:** 서버에 Chrome이 있으면, 확장을 **서버 경로**로 로드해서 사용 가능.  
- **“연결”의 의미:**  
  - **X11**: SSH `-X` + Windows X 서버 → 서버에서 띄운 Chrome **창만** Windows에 표시.  
  - **VNC**: Windows에서 VNC로 서버 **데스크톱**에 접속해, 그 안에서 Chrome 실행.  
- **추천:** 먼저 **X11 포워딩**(VcXsrv 또는 MobaXterm + `ssh -X`)으로 시도해 보고, 느리거나 불안정하면 VNC를 쓰면 됩니다.

---

## Part 2. Git 설정 (최종적으로 버전 관리하기)

아래는 **Linux 서버에서 저장소 초기화** → **원격(GitHub 등) 연결** → **Windows에서 clone해서 사용**까지의 전체 흐름입니다.

### 2-1. Linux 서버에서 Git 초기화 (한 번만)

1. **프로젝트 루트로 이동**
   ```bash
   cd /home/khk/2601_vibecoding/7_week_homework
   ```

2. **Git 저장소 생성**
   ```bash
   git init
   ```

3. **.gitignore 확인/생성**  
   (이미 프로젝트에 `.gitignore`가 있으면 내용만 확인 후 필요 시 추가.)
   - `node_modules/`, `__pycache__/`, `.env`, DB 파일, 테스트 결과물 등은 제외하는 것이 좋습니다.  
   - 아래 예시는 문서 끝 **부록: .gitignore 예시**를 참고하세요.

4. **첫 커밋**
   ```bash
   git add .
   git status   # 올라갈 파일 확인
   git commit -m "Initial: 7주 과제 (Playwright, 확장, DB 등)"
   ```

5. **원격 저장소 연결 (GitHub 예시)**
   - GitHub에서 새 저장소 생성 (이름 예: `7_week_homework`), **README/ .gitignore 추가 안 함**으로 생성.
   - 아래에서 `본인계정`과 `저장소이름`을 실제 값으로 바꿉니다.
   ```bash
   git remote add origin https://github.com/본인계정/저장소이름.git
   git branch -M main
   git push -u origin main
   ```
   - 이미 `main`이 아니라 `master`를 쓰면 `git branch -M main` 대신 그대로 push해도 됩니다.

이후 코드 수정 시:
```bash
git add .
git commit -m "작업 내용 요약"
git push
```

---

### 2-2. Windows 노트북에서 Clone 후 사용

1. **Clone**
   - Git Bash 또는 PowerShell:
   ```powershell
   cd C:\Users\본인사용자명\projects   # 원하는 상위 폴더
   git clone https://github.com/본인계정/저장소이름.git 7_week_homework
   cd 7_week_homework
   ```

2. **확장 프로그램 테스트**
   - Chrome → `chrome://extensions` → 개발자 모드 → **압축해제된 확장 프로그램 로드**  
   - **선택 경로**: `7_week_homework\04_geo_data_extension\extension`  
   - Part 1의 3~4번처럼 GSE 입력 → Collect → CSV 다운로드 확인.

3. **일상적인 작업 흐름**
   - **Linux에서 수정 후 push**
     ```bash
     cd /home/khk/2601_vibecoding/7_week_homework
     # 파일 수정 후
     git add .
     git commit -m "기능 설명"
     git push
     ```
   - **Windows에서 최신 코드 받아서 테스트**
     ```powershell
     cd C:\Users\본인사용자명\projects\7_week_homework
     git pull
     ```
     - Chrome 확장은 이미 로드된 상태면, **확장 프로그램 페이지에서 새로고침(↻)** 한 번 누르면 최신 코드로 갱신됩니다.

---

## 요약 체크리스트

| 단계 | 할 일 |
|------|--------|
| 1. 작동 확인 | Windows로 `04_geo_data_extension` 복사(scp/파일매니저) → Chrome에서 `extension` 폴더 로드 → GSE138669로 Collect → CSV 다운로드 확인 |
| 2. Git 초기화 | `7_week_homework`에서 `git init` → `.gitignore` 설정 → `git add` / `git commit` |
| 3. 원격 연결 | GitHub 등에 저장소 생성 → `git remote add origin` → `git push` |
| 4. Windows에서 사용 | `git clone` → 같은 경로로 확장 로드 → 필요 시 `git pull` 후 확장 새로고침 |

---

## 부록: .gitignore 예시

프로젝트 루트(`7_week_homework`)에 `.gitignore` 파일을 두고 아래를 참고해 필요한 항목만 넣을 수 있습니다.

```gitignore
# Node
node_modules/
npm-debug.log*

# Python
__pycache__/
*.py[cod]
.venv/
venv/
*.db

# 04 확장 서버 DB (로컬 테스트용)
04_geo_data_extension/server/geo_data.db

# Playwright / 테스트
01_playwright_geo_scrna/test-results/
01_playwright_geo_scrna/playwright-report/
01_playwright_geo_scrna/blob-report/
playwright/.cache/

# 기타
.DS_Store
.env
*.log
```

이 가이드대로 하면 “먼저 잘 작동하는지 확인”한 뒤, “최종적으로 Git으로 관리”까지 한 번에 정리할 수 있습니다.
