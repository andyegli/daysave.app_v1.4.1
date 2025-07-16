-- Fix for New Zealand Contacts - Proper User ID Setup
-- First, let's find existing users in your database

-- Step 1: Check what users exist in your database
SELECT id, username, email, first_name, last_name 
FROM users 
ORDER BY createdAt DESC 
LIMIT 10;

-- Step 2: Get the first available user ID (you can replace this with any specific user)
-- Copy the 'id' value from the query above and use it in the INSERT statements below

-- Step 3: Modified INSERT statements with proper structure
-- Replace 'REPLACE_WITH_ACTUAL_USER_ID' with a real user ID from Step 1

-- Contact 1: Sarah Mitchell - Auckland Business Professional
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), 'REPLACE_WITH_ACTUAL_USER_ID', 'Sarah Mitchell',
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', 'sarah.mitchell@kiwicorp.co.nz'),
    JSON_OBJECT('label', 'personal', 'value', 'sarah.m.nz@gmail.com')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 21 555 0123'),
    JSON_OBJECT('label', 'work', 'value', '+64 9 123 4567')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', '15 Queen Street, Auckland CBD, Auckland 1010, New Zealand'),
    JSON_OBJECT('label', 'home', 'value', '42 Remuera Road, Remuera, Auckland 1050, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'linkedin', 'value', 'linkedin.com/in/sarahmitchellnz')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'Senior Marketing Manager at KiwiCorp. Prefers email contact during business hours.')
  ),
  NOW(), NOW()
);

-- Alternative Method: Create a test user first, then add contacts
-- Uncomment and modify this if you want to create a dedicated test user

/*
-- Create a test user for these contacts
INSERT INTO users (
  id, username, email, password_hash, 
  first_name, last_name, role_id, 
  email_verified, subscription_status, language,
  createdAt, updatedAt
) VALUES (
  UUID(), 'testuser_nz', 'testuser@example.com', 
  '$2a$10$dummyhashforexample', -- You'll need a proper bcrypt hash
  'Test', 'User', 
  (SELECT id FROM roles WHERE name = 'user' LIMIT 1), -- Get user role ID
  1, 'trial', 'en',
  NOW(), NOW()
);

-- Get the test user ID
SET @test_user_id = (SELECT id FROM users WHERE username = 'testuser_nz' LIMIT 1);
*/

-- Quick fix method: Use an existing user
-- Run this to update all the previously inserted contacts (if any failed)

-- First, get an existing user ID
SET @existing_user_id = (SELECT id FROM users LIMIT 1);

-- Then use this user ID for all the contact inserts
-- Replace the INSERT statements in the previous file with this user ID:

-- Example for one contact - repeat pattern for all 10:
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @existing_user_id, 'Sarah Mitchell',
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', 'sarah.mitchell@kiwicorp.co.nz'),
    JSON_OBJECT('label', 'personal', 'value', 'sarah.m.nz@gmail.com')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 21 555 0123'),
    JSON_OBJECT('label', 'work', 'value', '+64 9 123 4567')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', '15 Queen Street, Auckland CBD, Auckland 1010, New Zealand'),
    JSON_OBJECT('label', 'home', 'value', '42 Remuera Road, Remuera, Auckland 1050, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'linkedin', 'value', 'linkedin.com/in/sarahmitchellnz')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'Senior Marketing Manager at KiwiCorp. Prefers email contact during business hours.')
  ),
  NOW(), NOW()
);

-- Troubleshooting queries:

-- Check if roles table has data
SELECT * FROM roles;

-- Check contacts table structure
DESCRIBE contacts;

-- Check if there are any existing contacts
SELECT COUNT(*) as contact_count FROM contacts;

-- Check foreign key constraints
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'daysave_v141' 
  AND TABLE_NAME = 'contacts' 
  AND REFERENCED_TABLE_NAME IS NOT NULL; 