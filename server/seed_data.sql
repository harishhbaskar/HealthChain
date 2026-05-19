-- =============================================
-- Seed Data for HealthChain MVP
-- Run AFTER database_schema.sql AND generateDemo.js
-- Updates auto-provisioned profiles with proper names
-- =============================================

USE healthchain_db;

-- ── Doctor Profiles ─────────────────────────────────────────
-- Update dr_house → Gregory House
UPDATE doctors SET first_name = 'Gregory', last_name = 'House', specialty = 'Diagnostic Medicine'
WHERE user_id = (SELECT id FROM users WHERE username = 'dr_house');

-- Update dr_strange → Stephen Strange
UPDATE doctors SET first_name = 'Stephen', last_name = 'Strange', specialty = 'Neurosurgery'
WHERE user_id = (SELECT id FROM users WHERE username = 'dr_strange');

-- ── Patient Profiles ────────────────────────────────────────
UPDATE patients SET first_name='Bruce', last_name='Wayne', date_of_birth='1980-02-19', gender='male', blood_type='AB+',
    phone_number='555-0101', email='bruce@wayneent.com', address='1007 Mountain Dr, Gotham',
    emergency_contact_name='Alfred Pennyworth', emergency_contact_phone='555-0102', insurance_provider='Wayne Health Plan'
WHERE user_id = (SELECT id FROM users WHERE username = 'bruce_wayne');

UPDATE patients SET first_name='Clark', last_name='Kent', date_of_birth='1984-06-18', gender='male', blood_type='O-',
    phone_number='555-0201', email='clark@dailyplanet.com', address='344 Clinton St, Metropolis',
    emergency_contact_name='Lois Lane', emergency_contact_phone='555-0202', insurance_provider='MetLife Plus'
WHERE user_id = (SELECT id FROM users WHERE username = 'clark_kent');

UPDATE patients SET first_name='Peter', last_name='Parker', date_of_birth='1998-08-10', gender='male', blood_type='A+',
    phone_number='555-0301', email='peter@bugle.com', address='20 Ingram St, Forest Hills, NY',
    emergency_contact_name='May Parker', emergency_contact_phone='555-0302', insurance_provider='NYC MediCare'
WHERE user_id = (SELECT id FROM users WHERE username = 'peter_parker');

UPDATE patients SET first_name='Diana', last_name='Prince', date_of_birth='1985-03-22', gender='female', blood_type='B+',
    phone_number='555-0401', email='diana@embassy.org', address='1 Embassy Row, Washington DC',
    emergency_contact_name='Hippolyta Prince', emergency_contact_phone='555-0402', insurance_provider='Amazonian Shield'
WHERE user_id = (SELECT id FROM users WHERE username = 'diana_prince');

UPDATE patients SET first_name='Tony', last_name='Stark', date_of_birth='1975-05-29', gender='male', blood_type='A-',
    phone_number='555-0501', email='tony@starkindustries.com', address='10880 Malibu Point, CA',
    emergency_contact_name='Pepper Potts', emergency_contact_phone='555-0502', insurance_provider='StarkCare Premium'
WHERE user_id = (SELECT id FROM users WHERE username = 'tony_stark');

UPDATE patients SET first_name='Natasha', last_name='Romanoff', date_of_birth='1990-11-22', gender='female', blood_type='O+',
    phone_number='555-0601', email='natasha@shield.gov', address='890 Fifth Ave, New York, NY',
    emergency_contact_name='Clint Barton', emergency_contact_phone='555-0602', insurance_provider='Federal Shield Plan'
WHERE user_id = (SELECT id FROM users WHERE username = 'natasha_romanoff');

UPDATE patients SET first_name='Barry', last_name='Allen', date_of_birth='1992-03-14', gender='male', blood_type='B-',
    phone_number='555-0701', email='barry@ccpd.gov', address='52 Central Ave, Central City',
    emergency_contact_name='Iris West', emergency_contact_phone='555-0702', insurance_provider='SpeedForce HMO'
WHERE user_id = (SELECT id FROM users WHERE username = 'barry_allen');

UPDATE patients SET first_name='Wanda', last_name='Maximoff', date_of_birth='1995-02-10', gender='female', blood_type='AB-',
    phone_number='555-0801', email='wanda@avengers.org', address='2800 Sherwood Dr, Westview, NJ',
    emergency_contact_name='Vision', emergency_contact_phone='555-0802', insurance_provider='Avengers Health'
WHERE user_id = (SELECT id FROM users WHERE username = 'wanda_maximoff');

UPDATE patients SET first_name='Steve', last_name='Rogers', date_of_birth='1970-07-04', gender='male', blood_type='O+',
    phone_number='555-0901', email='steve@avengers.org', address='569 Leaman Pl, Brooklyn, NY',
    emergency_contact_name='Sam Wilson', emergency_contact_phone='555-0902', insurance_provider='VA Healthcare'
WHERE user_id = (SELECT id FROM users WHERE username = 'steve_rogers');

UPDATE patients SET first_name='Selina', last_name='Kyle', date_of_birth='1988-09-15', gender='female', blood_type='A+',
    phone_number='555-1001', email='selina@gothammail.com', address='456 East End, Gotham',
    emergency_contact_name='Holly Robinson', emergency_contact_phone='555-1002', insurance_provider='Gotham General Plan'
WHERE user_id = (SELECT id FROM users WHERE username = 'selina_kyle');
