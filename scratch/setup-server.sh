#!/bin/bash
# ==============================================================================
# MANGALA PRIME - HETZNER VPS KURULUM BETİĞİ (Docker & Nginx Proxy Manager)
# ==============================================================================

set -e

echo "=== 1. Sistem Güncellemeleri Yapılıyor ==="
sudo apt-get update -y
sudo apt-get upgrade -y

echo "=== 2. Gerekli Paketler Kuruluyor ==="
sudo apt-get install -y curl git apt-transport-https ca-certificates gnupg lsb-release rsync

echo "=== 3. Docker Kuruluyor ==="
if ! command -v docker &> /dev/null; then
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "Docker başarıyla kuruldu!"
else
    echo "Docker zaten kurulu, atlanıyor."
fi

echo "=== 4. Ortak Docker Ağı (web-network) Oluşturuluyor ==="
if ! docker network inspect web-network >/dev/null 2>&1; then
    docker network create web-network
    echo "web-network ağı oluşturuldu!"
else
    echo "web-network ağı zaten mevcut."
fi

echo "=== 5. Nginx Proxy Manager Kuruluyor ==="
sudo mkdir -p /opt/nginx-proxy-manager
cd /opt/nginx-proxy-manager

cat << 'EOF' > docker-compose.yml
version: '3.8'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80'
      - '81:81'
      - '443:443'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - web-network

networks:
  web-network:
    external: true
EOF

docker compose up -d

echo "=== 6. Uygulama Dizinleri Hazırlanıyor ==="
sudo mkdir -p /var/www/mangala-prime
sudo touch /var/www/mangala-prime/.env

echo "=============================================================================="
echo "KURULUM BAŞARIYLA TAMAMLANDI!"
echo "------------------------------------------------------------------------------"
echo "Nginx Proxy Manager Yönetim Paneline erişebilirsiniz:"
echo "Adres: http://<sunucu-ip-adresiniz>:81"
echo "Varsayılan Giriş Bilgileri:"
echo "  E-posta: admin@example.com"
echo "  Şifre  : changeme"
echo "------------------------------------------------------------------------------"
echo "NOT: Giriş yaptıktan sonra e-posta ve şifrenizi hemen güncellemeniz istenir."
echo "=============================================================================="
