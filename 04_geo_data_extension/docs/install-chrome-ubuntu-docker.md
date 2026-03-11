# Ubuntu Docker에서 Chrome/Chromium 설치

Docker 컨테이너에서는 Snap이 동작하지 않거나 제한적이라 `snap install chromium` 대신 **Google Chrome .deb** 설치를 권장합니다.

## 1. Google Chrome 설치 (권장)

컨테이너 안에서:

```bash
# 의존성 + wget
apt-get update && apt-get install -y wget gnupg2 ca-certificates

# Google Linux signing key
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg

# Chrome stable 저장소 (Debian/Ubuntu)
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-key.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list

# 설치
apt-get update && apt-get install -y google-chrome-stable

# 실행 (디스플레이 없으면 --headless 또는 X11/VNC 필요)
google-chrome --version
```

## 2. X11 포워딩으로 창 띄우기

호스트에서 X 서버가 떠 있고, 컨테이너를 `-e DISPLAY=호스트IP:0` 등으로 띄웠다면:

```bash
google-chrome --no-sandbox
```

(일반 서버처럼 `ssh -X`로 접속한 터미널에서 실행하면 창이 포워딩됩니다.)

## 3. Dockerfile에 넣을 때 예시

```dockerfile
RUN apt-get update && apt-get install -y wget gnupg2 ca-certificates \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-key.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y google-chrome-stable \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
```

## 요약

| 방법 | Docker에서 |
|------|------------|
| `snap install chromium` | Snap 미지원/불안정 → 비추천 |
| `apt install google-chrome-stable` (Google repo) | .deb로 설치 → **권장** |
| Chromium deb (일부 PPA) | 가능하나 Google Chrome이 더 단순 |
