-- CORRECTED: New Zealand Contacts with Proper User ID Handling
-- This version fixes the foreign key constraint error

-- STEP 1: First, check what users exist in your database
-- Run this query to see available users:
-- SELECT id, username, email FROM users LIMIT 5;

-- STEP 2: Get the first available user ID and use it for all contacts
-- Copy a user ID from Step 1 and replace in the variable below

-- Set the user ID variable (REPLACE WITH ACTUAL USER ID FROM YOUR DATABASE)
SET @user_id = (SELECT id FROM users ORDER BY createdAt DESC LIMIT 1);

-- Verify the user exists
SELECT @user_id as selected_user_id, username, email FROM users WHERE id = @user_id;

-- STEP 3: Insert all 10 New Zealand contacts using the valid user ID

-- Contact 1: Sarah Mitchell - Auckland Business Professional
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @user_id, 'Sarah Mitchell',
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

-- Contact 2: James Thompson - Wellington Tech Developer
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @user_id, 'James Thompson',
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', 'james@techstart.nz'),
    JSON_OBJECT('label', 'personal', 'value', 'jthompson.dev@outlook.com')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 27 555 0234'),
    JSON_OBJECT('label', 'work', 'value', '+64 4 987 6543')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', '123 Lambton Quay, Wellington Central, Wellington 6011, New Zealand'),
    JSON_OBJECT('label', 'home', 'value', '78 Oriental Parade, Oriental Bay, Wellington 6011, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'github', 'value', 'github.com/jthompson-nz'),
    JSON_OBJECT('label', 'twitter', 'value', '@jamesthompson_nz')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'Full-stack developer specializing in React and Node.js. Available for freelance projects.')
  ),
  NOW(), NOW()
);

-- Contact 3: Emma Wilson - Christchurch Healthcare Professional
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @user_id, 'Emma Wilson',
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', 'e.wilson@christchurchhealth.nz'),
    JSON_OBJECT('label', 'personal', 'value', 'emmawilson.chch@gmail.com')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 22 555 0345'),
    JSON_OBJECT('label', 'work', 'value', '+64 3 456 7890')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', 'Christchurch Hospital, 2 Riccarton Avenue, Christchurch Central City, Christchurch 8011, New Zealand'),
    JSON_OBJECT('label', 'home', 'value', '156 Papanui Road, Papanui, Christchurch 8053, New Zealand'),
    JSON_OBJECT('label', 'weekend', 'value', '89 Marine Parade, New Brighton, Christchurch 8083, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'linkedin', 'value', 'linkedin.com/in/emmawilson-nurse')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'Registered Nurse in Emergency Department. Emergency contact only outside work hours.')
  ),
  NOW(), NOW()
);

-- Contact 4: Michael Brown - Hamilton Small Business Owner
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @user_id, 'Michael Brown',
  JSON_ARRAY(
    JSON_OBJECT('label', 'business', 'value', 'mike@brownscafe.co.nz'),
    JSON_OBJECT('label', 'personal', 'value', 'mikebrown.hamilton@yahoo.com')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 21 555 0456'),
    JSON_OBJECT('label', 'work', 'value', '+64 7 834 5678')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'business', 'value', '245 Victoria Street, Hamilton Central, Hamilton 3204, New Zealand'),
    JSON_OBJECT('label', 'home', 'value', '67 Hillcrest Road, Hillcrest, Hamilton 3216, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'facebook', 'value', 'facebook.com/brownscafehamilton'),
    JSON_OBJECT('label', 'instagram', 'value', '@brownscafe_hamilton')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'Owns Browns Cafe in Hamilton CBD. Great coffee supplier for events.')
  ),
  NOW(), NOW()
);

-- Contact 5: Lisa Chen - Dunedin University Researcher
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @user_id, 'Lisa Chen',
  JSON_ARRAY(
    JSON_OBJECT('label', 'university', 'value', 'lisa.chen@otago.ac.nz'),
    JSON_OBJECT('label', 'personal', 'value', 'lisachen.research@gmail.com')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 27 555 0567'),
    JSON_OBJECT('label', 'work', 'value', '+64 3 479 7890')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', 'University of Otago, 362 Leith Street, North Dunedin, Dunedin 9016, New Zealand'),
    JSON_OBJECT('label', 'home', 'value', '123 Albany Street, Dunedin North, Dunedin 9016, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'linkedin', 'value', 'linkedin.com/in/lisa-chen-researcher'),
    JSON_OBJECT('label', 'researchgate', 'value', 'researchgate.net/profile/Lisa-Chen-42')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'PhD in Environmental Science. Expert in climate change research for New Zealand.')
  ),
  NOW(), NOW()
);

-- Contact 6: David Taylor - Tauranga Construction Manager
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @user_id, 'David Taylor',
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', 'david@taurangabuilders.co.nz'),
    JSON_OBJECT('label', 'personal', 'value', 'davidtaylor.tga@hotmail.com')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 21 555 0678'),
    JSON_OBJECT('label', 'work', 'value', '+64 7 571 2345')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'work', 'value', '89 Cameron Road, Tauranga South, Tauranga 3112, New Zealand'),
    JSON_OBJECT('label', 'home', 'value', '45 Oceanbeach Road, Mount Maunganui, Tauranga 3116, New Zealand'),
    JSON_OBJECT('label', 'site_office', 'value', '234 Chapel Street, Tauranga Central, Tauranga 3110, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'facebook', 'value', 'facebook.com/taurangabuilders')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'Construction project manager. Available 24/7 for site emergencies.')
  ),
  NOW(), NOW()
);

-- Contact 7: Rachel Green - Rotorua Tourism Operator
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @user_id, 'Rachel Green',
  JSON_ARRAY(
    JSON_OBJECT('label', 'business', 'value', 'rachel@rotoruaadventures.co.nz'),
    JSON_OBJECT('label', 'personal', 'value', 'rachelgreen.rotorua@gmail.com')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 22 555 0789'),
    JSON_OBJECT('label', 'work', 'value', '+64 7 348 9012')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'business', 'value', '1123 Tutanekai Street, Rotorua Central, Rotorua 3010, New Zealand'),
    JSON_OBJECT('label', 'home', 'value', '567 Lake Road, Ngongotaha, Rotorua 3010, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'instagram', 'value', '@rotoruaadventures'),
    JSON_OBJECT('label', 'tripadvisor', 'value', 'tripadvisor.com/rotoruaadventures')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'Operates geothermal and adventure tours. Excellent local knowledge.')
  ),
  NOW(), NOW()
);

-- Contact 8: Andrew Smith - Palmerston North Farmer
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @user_id, 'Andrew Smith',
  JSON_ARRAY(
    JSON_OBJECT('label', 'farm', 'value', 'andrew@greenpastures.farm.nz'),
    JSON_OBJECT('label', 'personal', 'value', 'andrewsmith.pn@xtra.co.nz')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 27 555 0890'),
    JSON_OBJECT('label', 'home', 'value', '+64 6 356 7890')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'farm', 'value', '1456 Manawatu Valley Road, Ashhurst, Palmerston North 4810, New Zealand'),
    JSON_OBJECT('label', 'town', 'value', '78 College Street, Palmerston North Central, Palmerston North 4410, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'facebook', 'value', 'facebook.com/greenpasturesfarm')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'Dairy farmer with 300 cows. Supplies organic milk to local co-op.')
  ),
  NOW(), NOW()
);

-- Contact 9: Sophie Williams - Nelson Artist & Gallery Owner
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @user_id, 'Sophie Williams',
  JSON_ARRAY(
    JSON_OBJECT('label', 'gallery', 'value', 'sophie@nelsonartgallery.co.nz'),
    JSON_OBJECT('label', 'artist', 'value', 'sophiewilliams.art@gmail.com')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 21 555 0901'),
    JSON_OBJECT('label', 'gallery', 'value', '+64 3 548 1234')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'gallery', 'value', '234 Trafalgar Street, Nelson Central, Nelson 7010, New Zealand'),
    JSON_OBJECT('label', 'home', 'value', '89 Haven Road, Nelson South, Nelson 7010, New Zealand'),
    JSON_OBJECT('label', 'studio', 'value', '45 Richmond Road, Richmond, Tasman 7020, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'instagram', 'value', '@sophiewilliamsart'),
    JSON_OBJECT('label', 'website', 'value', 'sophiewilliamsart.co.nz')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'Contemporary artist specializing in landscapes. Gallery open Tue-Sat 10am-5pm.')
  ),
  NOW(), NOW()
);

-- Contact 10: Mark Johnson - Invercargill Mechanic
INSERT INTO contacts (
  id, user_id, name, 
  emails, phones, addresses, 
  social_profiles, notes, 
  createdAt, updatedAt
) VALUES (
  UUID(), @user_id, 'Mark Johnson',
  JSON_ARRAY(
    JSON_OBJECT('label', 'workshop', 'value', 'mark@johnsonautos.co.nz'),
    JSON_OBJECT('label', 'personal', 'value', 'markjohnson.inv@gmail.com')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'mobile', 'value', '+64 22 555 1012'),
    JSON_OBJECT('label', 'workshop', 'value', '+64 3 218 5678')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'workshop', 'value', '156 Tay Street, Invercargill Central, Invercargill 9810, New Zealand'),
    JSON_OBJECT('label', 'home', 'value', '234 North Road, Waikiwi, Invercargill 9812, New Zealand')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'facebook', 'value', 'facebook.com/johnsonautos')
  ),
  JSON_ARRAY(
    JSON_OBJECT('label', 'note', 'value', 'Certified automotive technician. Specializes in European vehicles. 25+ years experience.')
  ),
  NOW(), NOW()
);

-- Verify all contacts were inserted successfully
SELECT COUNT(*) as 'New Zealand Contacts Added' FROM contacts WHERE user_id = @user_id;

-- Show the contacts that were just added
SELECT name, JSON_EXTRACT(phones, '$[0].value') as mobile_phone, 
       JSON_EXTRACT(addresses, '$[0].value') as primary_address
FROM contacts 
WHERE user_id = @user_id 
ORDER BY createdAt DESC 
LIMIT 10; 