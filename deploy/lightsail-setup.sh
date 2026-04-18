#!/bin/bash
# ============================================================
#  센드잇 (SendIt) — Lightsail 초기 설정 스크립트
#  Ubuntu 인스턴스에서 최초 1회 실행
#
#  사용법:
#    curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/deploy/lightsail-setup.sh | bash
#    또는
#    chmod +x lightsail-setup.sh && ./lightsail-setup.sh
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo "=========================================="
echo "  센드잇 (SendIt) — Lightsail 초기 설정"
echo "=========================================="
echo ""

# ─── 1. 시스템 업데이트 ───
log "시스템 업데이트 중..."
sudo apt update && sudo apt upgrade -y

# ─── 2. Docker 설치 ───
if command -v docker &>/dev/null; then
    log "Docker 이미 설치됨: $(docker --version)"
else
    log "Docker 설치 중..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    log "Docker 설치 완료"
fi

# ─── 3. Docker Compose 확인 ───
if docker compose version &>/dev/null; then
    log "Docker Compose 확인: $(docker compose version)"
else
    err "Docker Compose V2가 필요합니다."
fi

# ─── 4. Git 설치 ───
if ! command -v git &>/dev/null; then
    log "Git 설치 중..."
    sudo apt install -y git
fi

# ─── 5. 앱 디렉토리 생성 ───
APP_DIR="/opt/sendit"
sudo mkdir -p ${APP_DIR}
sudo chown $USER:$USER ${APP_DIR}

# ─── 6. 프로젝트 클론 ───
if [ -d "${APP_DIR}/repo" ]; then
    log "기존 레포 발견 — pull..."
    cd ${APP_DIR}/repo && git pull
else
    echo ""
    warn "GitHub 레포지토리를 클론합니다."
    read -p "  GitHub 레포 URL (예: https://github.com/user/sendit.git): " REPO_URL
    git clone "$REPO_URL" ${APP_DIR}/repo
    log "레포 클론 완료"
fi

cd ${APP_DIR}/repo

# ─── 7. .env 파일 생성 ───
if [ ! -f ${APP_DIR}/.env ]; then
    cp .env.example ${APP_DIR}/.env
    chmod 600 ${APP_DIR}/.env
    warn ".env 파일이 생성되었습니다!"
    warn "반드시 실제 값으로 수정하세요: nano ${APP_DIR}/.env"
else
    log ".env 파일 이미 존재"
fi

# ─── 8. docker-compose 심볼릭 링크 ───
ln -sf ${APP_DIR}/repo/docker-compose.prod.yml ${APP_DIR}/docker-compose.prod.yml
ln -sf ${APP_DIR}/repo/frontend ${APP_DIR}/frontend-src
ln -sf ${APP_DIR}/repo/backend ${APP_DIR}/backend-src

# ─── 9. 방화벽 (ufw) ───
log "방화벽 설정..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable
log "방화벽 활성화 (22, 80, 443 허용)"

# ─── 10. 스왑 메모리 (1GB — 소형 인스턴스용) ───
if [ ! -f /swapfile ]; then
    log "스왑 파일 생성 (1GB)..."
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    log "스왑 활성화 완료"
else
    log "스왑 이미 존재"
fi

echo ""
echo "=========================================="
echo "  초기 설정 완료!"
echo "=========================================="
echo ""
echo "  다음 단계:"
echo ""
echo "  1. .env 파일 수정:"
echo "     nano ${APP_DIR}/.env"
echo ""
echo "  2. Docker 빌드 & 실행:"
echo "     cd ${APP_DIR}/repo"
echo "     cp ${APP_DIR}/.env ."
echo "     docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "  3. 로그 확인:"
echo "     docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "  4. (선택) SSL 인증서 발급:"
echo "     sudo apt install -y certbot"
echo "     # 도메인 연결 후 실행"
echo ""
warn "Docker 그룹 적용을 위해 재로그인 필요: exit 후 다시 SSH"
echo ""
