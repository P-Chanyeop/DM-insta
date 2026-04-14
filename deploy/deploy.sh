#!/bin/bash
# ============================================================
#  센드잇 (SendIt) — AWS Lightsail 배포 스크립트
#  사용법: ./deploy.sh [setup|build|deploy|all]
# ============================================================

set -euo pipefail

APP_DIR="/opt/sendit"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="sendit"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── 서버 초기 세팅 (최초 1회) ────────────────────────────
cmd_setup() {
    log "서버 초기 세팅 시작..."

    # 시스템 패키지
    sudo apt update && sudo apt install -y \
        openjdk-21-jre-headless \
        nginx \
        mysql-server \
        certbot python3-certbot-nginx

    # sendit 유저 생성
    if ! id -u sendit &>/dev/null; then
        sudo useradd -r -m -d /opt/sendit -s /bin/false sendit
        log "sendit 유저 생성 완료"
    fi

    # 디렉토리 구조
    sudo mkdir -p ${APP_DIR}/{logs,frontend}
    sudo chown -R sendit:sendit ${APP_DIR}

    # .env 파일 템플릿 복사
    if [ ! -f ${APP_DIR}/.env ]; then
        sudo cp "${REPO_DIR}/.env.example" ${APP_DIR}/.env
        sudo chown sendit:sendit ${APP_DIR}/.env
        sudo chmod 600 ${APP_DIR}/.env
        warn ".env 파일이 생성되었습니다. 실제 값으로 수정하세요:"
        warn "  sudo nano ${APP_DIR}/.env"
    fi

    # systemd 서비스 등록
    sudo cp "${REPO_DIR}/deploy/sendit.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable ${SERVICE_NAME}

    # Nginx 설정
    sudo cp "${REPO_DIR}/deploy/nginx.conf" /etc/nginx/sites-available/sendit
    sudo ln -sf /etc/nginx/sites-available/sendit /etc/nginx/sites-enabled/sendit
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx

    # MySQL 초기 DB (root 비밀번호 설정 후 실행)
    log "MySQL 데이터베이스 생성..."
    warn "MySQL root 비밀번호를 입력하세요:"
    sudo mysql -u root -p <<'SQL'
CREATE DATABASE IF NOT EXISTS sendit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sendit'@'localhost' IDENTIFIED BY 'CHANGE_ME';
GRANT ALL PRIVILEGES ON sendit.* TO 'sendit'@'localhost';
FLUSH PRIVILEGES;
SQL
    warn "MySQL sendit 유저 비밀번호를 변경하세요:"
    warn "  sudo mysql -u root -p -e \"ALTER USER 'sendit'@'localhost' IDENTIFIED BY '새비밀번호';\""

    log "초기 세팅 완료! .env 파일과 MySQL 비밀번호를 반드시 수정하세요."
}

# ─── 빌드 ──────────────────────────────────────────────────
cmd_build() {
    log "빌드 시작..."
    cd "${REPO_DIR}"

    # Backend (Gradle)
    log "백엔드 빌드 중..."
    cd backend
    chmod +x gradlew 2>/dev/null || true
    ./gradlew clean bootJar -x test --no-daemon
    cd ..
    log "백엔드 JAR 생성 완료"

    # Frontend (Vite)
    log "프론트엔드 빌드 중..."
    cd frontend
    npm ci
    npm run build
    cd ..
    log "프론트엔드 빌드 완료"
}

# ─── 배포 ──────────────────────────────────────────────────
cmd_deploy() {
    log "배포 시작..."

    # JAR 복사
    JAR_FILE=$(ls -t "${REPO_DIR}/backend/build/libs/"*.jar 2>/dev/null | head -1)
    if [ -z "$JAR_FILE" ]; then
        err "JAR 파일을 찾을 수 없습니다. 먼저 build를 실행하세요."
    fi
    sudo cp "$JAR_FILE" ${APP_DIR}/backend.jar
    sudo chown sendit:sendit ${APP_DIR}/backend.jar
    log "JAR 복사: $(basename $JAR_FILE)"

    # 프론트엔드 정적 파일 복사
    if [ -d "${REPO_DIR}/frontend/dist" ]; then
        sudo rm -rf ${APP_DIR}/frontend/*
        sudo cp -r "${REPO_DIR}/frontend/dist/"* ${APP_DIR}/frontend/
        sudo chown -R sendit:sendit ${APP_DIR}/frontend
        log "프론트엔드 파일 배포 완료"
    else
        err "frontend/dist 폴더를 찾을 수 없습니다. 먼저 build를 실행하세요."
    fi

    # 서비스 재시작
    sudo systemctl restart ${SERVICE_NAME}
    sleep 3

    if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
        log "센드잇 서비스 재시작 성공!"
    else
        err "서비스 시작 실패. 로그 확인: sudo journalctl -u ${SERVICE_NAME} -n 50"
    fi

    # Nginx reload
    sudo nginx -t && sudo systemctl reload nginx
    log "배포 완료!"
}

# ─── 메인 ──────────────────────────────────────────────────
case "${1:-help}" in
    setup)
        cmd_setup
        ;;
    build)
        cmd_build
        ;;
    deploy)
        cmd_deploy
        ;;
    all)
        cmd_build
        cmd_deploy
        ;;
    *)
        echo "사용법: $0 {setup|build|deploy|all}"
        echo ""
        echo "  setup   서버 초기 세팅 (최초 1회)"
        echo "  build   백엔드 JAR + 프론트엔드 빌드"
        echo "  deploy  빌드된 파일을 서버에 배포"
        echo "  all     빌드 + 배포"
        ;;
esac
