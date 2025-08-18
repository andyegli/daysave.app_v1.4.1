#!/bin/bash
set -e

echo "🔄 Professional Database Migration Script"
echo "========================================"

# Get credentials from environment
DB_ROOT_PASS="${DB_ROOT_PASSWORD}"
DB_USER_PASS="${DB_USER_PASSWORD}"

if [ -z "$DB_ROOT_PASS" ] || [ -z "$DB_USER_PASS" ]; then
    echo "❌ Error: Database credentials not provided"
    echo "Required: DB_ROOT_PASSWORD, DB_USER_PASSWORD"
    exit 1
fi

echo "🏗️ Step 1: Waiting for database to be ready..."
for i in {1..30}; do
    if docker exec daysave-db mysql -u root -p"$DB_ROOT_PASS" -e 'SELECT 1' >/dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    echo "Attempt $i/30: Database not ready, waiting 10 seconds..."
    sleep 10
    if [ $i -eq 30 ]; then
        echo "❌ Database failed to become ready after 5 minutes"
        exit 1
    fi
done

echo "🏗️ Step 2: Creating database and user..."
docker exec daysave-db mysql -u root -p"$DB_ROOT_PASS" -e "
CREATE DATABASE IF NOT EXISTS daysave_v141;
CREATE USER IF NOT EXISTS 'daysave'@'%' IDENTIFIED BY '$DB_USER_PASS';
GRANT ALL PRIVILEGES ON daysave_v141.* TO 'daysave'@'%';
FLUSH PRIVILEGES;
" 2>/dev/null

echo "🧹 Step 3: Cleaning migration state..."
docker exec daysave-db mysql -u root -p"$DB_ROOT_PASS" -e "DROP TABLE IF EXISTS daysave_v141.SequelizeMeta;" 2>/dev/null || true

echo "🔧 Step 4: Building migration container..."
docker build -t daysave-migration:latest -f scripts/docker-migration.Dockerfile .

echo "📝 Step 5: Creating migration environment..."
cat > .env.migration << EOF
NODE_ENV=production
DB_HOST=daysave-db
DB_USER=daysave
DB_USER_PASSWORD=$DB_USER_PASS
DB_ROOT_PASSWORD=$DB_ROOT_PASS
DB_NAME=daysave_v141
DB_PORT=3306
EOF

echo "🚀 Step 6: Running migrations..."
if docker run --rm --network daysave_v141_daysave-internal --env-file .env.migration daysave-migration:latest; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migration failed - checking logs..."
    docker logs daysave-db --tail=20
    exit 1
fi

echo "🔍 Step 7: Verifying migration results..."
MIGRATION_COUNT=$(docker exec daysave-db mysql -u root -p"$DB_ROOT_PASS" -se "SELECT COUNT(*) FROM daysave_v141.SequelizeMeta;" 2>/dev/null || echo "0")
TABLE_COUNT=$(docker exec daysave-db mysql -u root -p"$DB_ROOT_PASS" -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'daysave_v141';" 2>/dev/null || echo "0")

echo "📊 Migration Results:"
echo "  - Applied migrations: $MIGRATION_COUNT"
echo "  - Total tables: $TABLE_COUNT"

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo "✅ Database schema created successfully"
    
    # Show some tables for verification
    echo "📋 Sample tables created:"
    docker exec daysave-db mysql -u root -p"$DB_ROOT_PASS" -se "USE daysave_v141; SHOW TABLES LIMIT 5;" 2>/dev/null || true
else
    echo "❌ No tables created - migration may have failed"
    exit 1
fi

echo "🧹 Step 8: Cleanup..."
rm -f .env.migration

echo "🎉 Professional migration completed successfully!"
