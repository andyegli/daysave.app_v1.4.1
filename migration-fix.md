# CI/CD Migration Issues and Solutions

## 🚨 **Problems Identified:**

### 1. **Network Connectivity in Migration Step**
- **Issue:** `npx sequelize-cli` fails with `EAI_AGAIN` (DNS resolution failure)
- **Location:** Step 7 in deploy.yml line 324
- **Cause:** Container can't reach npm registry from inside Docker network

### 2. **Password Mismatch**
- **Issue:** Workflow uses `${{ secrets.DB_USER_PASSWORD }}` but containers use auto-generated passwords
- **Location:** Lines 310, 321, 336
- **Cause:** Docker Compose generates random passwords, GitHub secrets have different values

### 3. **Missing Sequelize CLI in Container**
- **Issue:** Production container doesn't have sequelize-cli installed
- **Location:** gcr.io/daysave/daysave:latest container
- **Cause:** Production Dockerfile only installs production dependencies

### 4. **Environment File Inconsistency**
- **Issue:** .env.production created with template values, not actual container passwords
- **Location:** Step 4 environment configuration
- **Cause:** Workflow creates env file before containers generate passwords

## 🔧 **Solutions:**

### Solution 1: Pre-built Migration Container
```yaml
# Add to workflow before migration step
- name: 🔄 Build migration container with sequelize-cli
  run: |
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --command="
      cd daysave_v1.4.1
      # Create temporary Dockerfile with sequelize-cli
      cat > Dockerfile.migration << 'EOF'
      FROM gcr.io/daysave/daysave:latest
      RUN npm install -g sequelize-cli
      EOF
      
      sudo docker build -f Dockerfile.migration -t daysave-migration .
    "
```

### Solution 2: Direct SQL Migration
```yaml
# Replace sequelize-cli with direct SQL execution
- name: 🔄 Run database migrations via SQL
  run: |
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --command="
      cd daysave_v1.4.1
      # Get actual database password from container
      DB_PASSWORD=\$(sudo docker inspect daysave-db | grep MYSQL_ROOT_PASSWORD | cut -d'=' -f2 | tr -d '\"')
      
      # Run each migration SQL file directly
      for migration in migrations/*.js; do
        echo \"Processing \$migration\"
        # Convert JS migration to SQL and execute
        sudo docker exec daysave-db mysql -u root -p\$DB_PASSWORD daysave_v141 < \$migration.sql
      done
    "
```

### Solution 3: Fix Environment Synchronization
```yaml
# Update environment configuration to use actual container passwords
- name: ⚙️ Configure environment with actual passwords
  run: |
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --command="
      cd daysave_v1.4.1
      
      # Get actual passwords from running containers
      DB_ROOT_PASS=\$(sudo docker inspect daysave-db | grep MYSQL_ROOT_PASSWORD | cut -d'=' -f2 | tr -d '\"')
      DB_USER_PASS=\$(sudo docker inspect daysave-db | grep MYSQL_PASSWORD | cut -d'=' -f2 | tr -d '\"')
      
      # Update .env.production with actual passwords
      sed -i \"s/DB_ROOT_PASSWORD=.*/DB_ROOT_PASSWORD=\$DB_ROOT_PASS/g\" .env.production
      sed -i \"s/DB_USER_PASSWORD=.*/DB_USER_PASSWORD=\$DB_USER_PASS/g\" .env.production
    "
```

### Solution 4: Better Health Checks
```yaml
# Add proper database readiness check
- name: ⏳ Wait for database to be fully ready
  run: |
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --command="
      echo '⏳ Waiting for database to be fully ready...'
      for i in {1..60}; do
        if sudo docker exec daysave-db mysql -u root -p\$DB_ROOT_PASS -e 'SELECT 1' >/dev/null 2>&1; then
          echo '✅ Database is ready for migrations'
          break
        fi
        echo \"Attempt \$i/60: Database not ready yet, waiting 5 seconds...\"
        sleep 5
      done
    "
```

## 🎯 **Recommended Fix:**

Use **Solution 3** (Fix Environment Synchronization) combined with **Solution 1** (Pre-built Migration Container) for the most robust approach.
