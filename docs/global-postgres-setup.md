# Global PostgreSQL 18 Çoklu Veritabanı Kurulum Kılavuzu

Bu doküman, tek bir VPS (örn. Hetzner 4GB RAM) veya yerel geliştirme makinesinde birden fazla projenin veritabanını barındıracak ortak (global) **PostgreSQL 18** konteyner mimarisinin kurulumunu ve yapılandırmasını açıklar. Gelecekteki tüm projelerinizde bu yapıyı aynen kopyalayarak kullanabilirsiniz.

---

## 1. Mimari Genel Bakış

Aşağıdaki şemada yerel geliştirme ve canlı (VPS) ortamlarının izolasyon stratejisi gösterilmektedir:

```mermaid
graph TD
    subgraph Yerel Geliştirme (Localhost)
        LC[Local Container] -->|Port: 127.0.0.1:5432| LH[Sadece Localhost Loopback]
        LH --> DB1[mangala_db]
        LH --> DB2[proje2_db]
    end
    subgraph Canlı Sunucu (Hetzner VPS)
        VC[VPS Container] -->|Port Mapping Yok| VN[Docker İç Ağı: web-network]
        VN --> API1[Mangala API]
        VN --> API2[Proje 2 API]
        Internet((Internet)) -->|Erişim Engelli| VC
    end
```

---

## 2. Docker Yapılandırması

Global PostgreSQL servisini çalıştırmak için aşağıdaki iki dosyayı bağımsız bir dizinde (`docker/postgres/` gibi) barındırabilirsiniz.

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres-db:
    image: postgres:18-alpine
    container_name: global-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=400B1teker
      # Virgülle ayrılmış olarak oluşturulacak veritabanı isimlerini buraya yazın
      - POSTGRES_MULTIPLE_DATABASES=mangala_db,proje2_db,proje3_db
    ports:
      # YEREL GELİŞTİRME İÇİN: Dışarıya açmadan sadece localhost'a bağlar
      - "127.0.0.1:5432:5432"
      # CANLI VPS İÇİN: Yukarıdaki ports bloğunu kaldırın veya yorum satırı yapın!
    volumes:
      - postgres_data:/var/lib/postgresql
      - ./init-db.sh:/docker-entrypoint-initdb.d/init-db.sh:ro
    networks:
      - db-network

networks:
  db-network:
    name: web-network
    external: true

volumes:
  postgres_data:
```

### Çoklu Veritabanı Başlatma Betiği (`init-db.sh`)

Bu betik, PostgreSQL konteyneri ilk kez ayağa kalktığında `POSTGRES_MULTIPLE_DATABASES` içindeki veritabanlarını otomatik olarak oluşturur.

```bash
#!/bin/bash
set -e
set -u

function create_database() {
	local database=$1
	echo "  Creating database '$database'"
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	    CREATE DATABASE "$database";
	EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
	echo "Multiple databases creation requested: $POSTGRES_MULTIPLE_DATABASES"
	for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
		db_exists=$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='$db'")
		if [ "$db_exists" != "1" ]; then
			create_database $db
		else
			echo "  Database '$db' already exists"
		fi
	done
	echo "Multiple databases creation complete!"
fi
```

*Not: `init-db.sh` dosyasının çalıştırılabilir olduğundan emin olun (`chmod +x init-db.sh`).*

---

## 3. Bağlantı Yönergeleri ve Optimizasyonlar (Prisma 7+)

Düşük kaynaklı VPS sunucularında (örn: 4GB RAM) 10+ uygulamanın PostgreSQL'i şişirmesini önlemek için aşağıdaki Prisma ve connection limit kurallarına kesinlikle uyulmalıdır.

### A. Connection Pooling (Bağlantı Limiti)
Her bir projenin `DATABASE_URL` tanımında maksimum bağlantı sayısı `connection_limit=3` ile sınırlandırılmalıdır. Aksi takdirde her uygulama varsayılan olarak ~10+ bağlantı açarak veritabanının RAM tüketimini tavan yaptırır.

```env
# Bağlantı Limitli DATABASE_URL Formatı
DATABASE_URL="postgresql://postgres:400B1teker@localhost:5432/mangala_db?connection_limit=3&pool_timeout=20"
```

### B. PostgreSQL 18 Mimari Yönergeleri

Gelecekteki projelerde PostgreSQL 18'in getirdiği yeniliklerden faydalanmak için aşağıdaki kuralları uygulayın:

1. **JSON Standartları (`JSON_TABLE`):** JSON verilerinde derin aramalar veya dönüşümler yaparken PostgreSQL 18 uyumlu standart SQL/JSON (`JSON_TABLE`) syntax'ını tercih edin. Bu yapı Prisma'nın standart API'si dışında kalıyorsa `$queryRaw` kullanarak SQL sorgusunu çalıştırın.
2. **B-Tree Index Optimizasyonları:** Sık güncellenen tablolarda (aktif lobi odaları, hamle logları vb.) gereksiz index oluşturmaktan kaçının. PostgreSQL 18 B-Tree optimizasyonları sayesinde temiz ve `VACUUM` dostu şemalar tasarlayın.
3. **Müşterek Bağlantı Yönetimi:** Sunucu üzerinde çalışan tüm servisler connection pooling mimarisine sadık kalmalı, veritabanı bağlantısı uygulama düzeyinde kalıcı (singleton) bir servis üzerinden yönetilmelidir.
