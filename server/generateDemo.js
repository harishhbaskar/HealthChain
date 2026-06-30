// server/generateDemo.js
// ═══════════════════════════════════════════════════════════════
//  HealthChain MVP — Rich Demo Data Generator
//  Generates realistic data so dr_house looks like an active user
// ═══════════════════════════════════════════════════════════════
const API_URL = 'http://localhost:3000/api';

// ── Helpers ──────────────────────────────────────────────────
const register = async (username, role) => {
    try {
        await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: 'password123', role }),
        });
        console.log(`  ✅ Registered ${role}: ${username}`);
    } catch {
        console.log(`  ⚠️  ${username} may already exist`);
    }
};

const login = async (username) => {
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: 'password123' }),
    });
    const data = await res.json();
    return data.token;
};

const addRecord = async (token, payload) => {
    const res = await fetch(`${API_URL}/records`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
        console.error(`  ❌ Record rejected for patient ${payload.patient_id}:`, data);
        return;
    }
    console.log(`  🏥 Record for patient ${payload.patient_id} | Hash: ${data.blockchainHash?.substring(0, 12)}...`);
    return data;
};

const bookAppointment = async (token, payload) => {
    const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
        // Silently skip conflicts (expected with dense scheduling)
        if (res.status !== 409) console.error(`  ❌ Appointment error:`, data);
        return;
    }
    console.log(`  📅 Appointment ${payload.appointment_date} ${payload.appointment_time} for patient ${payload.patient_id}`);
    return data.appointmentId;
};

const updateAppointmentStatus = async (token, appointmentId, status) => {
    const res = await fetch(`${API_URL}/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
    });
    if (res.ok) console.log(`  🔄 Appointment ${appointmentId} → ${status}`);
};

// ── Patient profiles (will be updated via direct DB after registration) ──
const PATIENT_PROFILES = [
    { username: 'bruce_wayne',   first: 'Bruce',    last: 'Wayne',    dob: '1980-02-19', gender: 'male',   blood: 'AB+', phone: '555-0101', email: 'bruce@wayneent.com',      address: '1007 Mountain Dr, Gotham',        ecName: 'Alfred Pennyworth', ecPhone: '555-0102', insurance: 'Wayne Health Plan' },
    { username: 'clark_kent',    first: 'Clark',    last: 'Kent',     dob: '1984-06-18', gender: 'male',   blood: 'O-',  phone: '555-0201', email: 'clark@dailyplanet.com',    address: '344 Clinton St, Metropolis',      ecName: 'Lois Lane',         ecPhone: '555-0202', insurance: 'MetLife Plus' },
    { username: 'peter_parker',  first: 'Peter',    last: 'Parker',   dob: '1998-08-10', gender: 'male',   blood: 'A+',  phone: '555-0301', email: 'peter@bugle.com',          address: '20 Ingram St, Forest Hills, NY',  ecName: 'May Parker',        ecPhone: '555-0302', insurance: 'NYC MediCare' },
    { username: 'diana_prince',  first: 'Diana',    last: 'Prince',   dob: '1985-03-22', gender: 'female', blood: 'B+',  phone: '555-0401', email: 'diana@embassy.org',        address: '1 Embassy Row, Washington DC',    ecName: 'Hippolyta Prince',  ecPhone: '555-0402', insurance: 'Amazonian Shield' },
    { username: 'tony_stark',    first: 'Tony',     last: 'Stark',    dob: '1975-05-29', gender: 'male',   blood: 'A-',  phone: '555-0501', email: 'tony@starkindustries.com', address: '10880 Malibu Point, CA',          ecName: 'Pepper Potts',      ecPhone: '555-0502', insurance: 'StarkCare Premium' },
    { username: 'natasha_romanoff', first: 'Natasha', last: 'Romanoff', dob: '1990-11-22', gender: 'female', blood: 'O+', phone: '555-0601', email: 'natasha@shield.gov',      address: '890 Fifth Ave, New York, NY',     ecName: 'Clint Barton',      ecPhone: '555-0602', insurance: 'Federal Shield Plan' },
    { username: 'barry_allen',   first: 'Barry',    last: 'Allen',    dob: '1992-03-14', gender: 'male',   blood: 'B-',  phone: '555-0701', email: 'barry@ccpd.gov',           address: '52 Central Ave, Central City',    ecName: 'Iris West',         ecPhone: '555-0702', insurance: 'SpeedForce HMO' },
    { username: 'wanda_maximoff', first: 'Wanda',   last: 'Maximoff', dob: '1995-02-10', gender: 'female', blood: 'AB-', phone: '555-0801', email: 'wanda@avengers.org',       address: '2800 Sherwood Dr, Westview, NJ',  ecName: 'Vision',            ecPhone: '555-0802', insurance: 'Avengers Health' },
    { username: 'steve_rogers',  first: 'Steve',    last: 'Rogers',   dob: '1970-07-04', gender: 'male',   blood: 'O+',  phone: '555-0901', email: 'steve@avengers.org',       address: '569 Leaman Pl, Brooklyn, NY',     ecName: 'Sam Wilson',        ecPhone: '555-0902', insurance: 'VA Healthcare' },
    { username: 'selina_kyle',   first: 'Selina',   last: 'Kyle',     dob: '1988-09-15', gender: 'female', blood: 'A+',  phone: '555-1001', email: 'selina@gothammail.com',    address: '456 East End, Gotham',            ecName: 'Holly Robinson',    ecPhone: '555-1002', insurance: 'Gotham General Plan' },
];

// ── Medical record templates ────────────────────────────────
const RECORDS = [
    // Bruce Wayne records (chronic back pain arc)
    { patient: 'bruce_wayne', subjective: 'Patient complains of chronic back pain radiating to left shoulder. Pain worse at night. Reports difficulty sleeping.', vitals: { bp: '130/85', hr: 65, temp: 98.2, spo2: 97, weight: 210 }, assessment: 'Chronic Lumbar Strain', severity: 'moderate', plan: 'Ibuprofen 400mg TID, physical therapy 2x/week. Follow-up MRI.', allergies: 'Penicillin', followUp: '2 weeks' },
    { patient: 'bruce_wayne', subjective: 'Follow-up for back pain. MRI shows mild disc herniation L4-L5. Patient reports slight improvement with PT.', vitals: { bp: '128/82', hr: 62, temp: 98.4, spo2: 98, weight: 208 }, assessment: 'Lumbar Disc Herniation L4-L5', severity: 'moderate', plan: 'Continue PT. Add Cyclobenzaprine 10mg at bedtime. Ergonomic assessment recommended.', allergies: 'Penicillin', followUp: '4 weeks' },
    { patient: 'bruce_wayne', subjective: 'Patient sustained contusion to right forearm. States he fell during exercise. ROM slightly limited.', vitals: { bp: '135/88', hr: 70, temp: 98.6, spo2: 98, weight: 210 }, assessment: 'Right Forearm Contusion', severity: 'mild', plan: 'RICE protocol. Compression wrap. Follow up if swelling persists.', allergies: 'Penicillin', followUp: '1 week' },

    // Clark Kent records
    { patient: 'clark_kent', subjective: 'Annual physical. Patient reports excellent health. No complaints. Very active lifestyle.', vitals: { bp: '118/76', hr: 52, temp: 98.6, spo2: 99, weight: 235 }, assessment: 'Routine Physical – Excellent Health', severity: 'mild', plan: 'No intervention needed. Continue regular exercise and diet.', allergies: 'None known', followUp: '1 year' },
    { patient: 'clark_kent', subjective: 'Patient reports intermittent migraine-like headaches near specific geological sites. EEG normal.', vitals: { bp: '120/78', hr: 55, temp: 98.4, spo2: 99, weight: 235 }, assessment: 'Tension Headaches (Environmental)', severity: 'mild', plan: 'Avoid known triggers. Sumatriptan 50mg PRN. Headache diary recommended.', allergies: 'None known', followUp: '3 months' },

    // Peter Parker records (young patient, spider bite arc)
    { patient: 'peter_parker', subjective: 'Patient presents with dizziness, low-grade fever, and unusual rash on right hand from insect bite 3 days ago.', vitals: { bp: '140/90', hr: 88, temp: 100.1, spo2: 96, weight: 167 }, assessment: 'Acute Reaction – Arthropod Bite', severity: 'moderate', plan: 'Blood panel ordered. Topical hydrocortisone. Antihistamine PRN. Return if symptoms worsen.', allergies: 'Sulfa drugs', followUp: '1 week' },
    { patient: 'peter_parker', subjective: 'Follow-up for insect bite. Rash resolved. Patient reports dramatically improved reflexes and vision.', vitals: { bp: '122/78', hr: 60, temp: 98.6, spo2: 99, weight: 170 }, assessment: 'Resolved Arthropod Bite – Observation', severity: 'mild', plan: 'No further treatment. Schedule ophthalmology consult for vision changes.', allergies: 'Sulfa drugs', followUp: '6 months' },
    { patient: 'peter_parker', subjective: 'Sports physical clearance. Patient is very fit. Reports increased metabolism.', vitals: { bp: '115/72', hr: 56, temp: 98.2, spo2: 99, weight: 172 }, assessment: 'Sports Physical – Cleared', severity: 'mild', plan: 'Cleared for all physical activities. Increase caloric intake to match metabolism.', allergies: 'Sulfa drugs', followUp: '1 year' },

    // Diana Prince records
    { patient: 'diana_prince', subjective: 'New patient intake. Patient is in exceptional health. Reports regular high-intensity training.', vitals: { bp: '110/70', hr: 48, temp: 98.0, spo2: 99, weight: 165 }, assessment: 'New Patient Intake – Excellent Health', severity: 'mild', plan: 'Baseline labs ordered (CBC, CMP, Lipid panel). No concerns.', allergies: 'None known', followUp: '1 year' },
    { patient: 'diana_prince', subjective: 'Patient presents with laceration on left forearm sustained during fencing practice. 4cm wound, clean edges.', vitals: { bp: '112/72', hr: 50, temp: 98.2, spo2: 99, weight: 165 }, assessment: 'Left Forearm Laceration', severity: 'mild', plan: 'Wound cleaned and closed with 6 sutures. Tetanus booster administered. Keep dry 48h.', allergies: 'None known', followUp: '10 days' },

    // Tony Stark records (cardiac)
    { patient: 'tony_stark', subjective: 'Patient reports palpitations and chest tightness. History of cardiac device implant. ECG shows PVCs.', vitals: { bp: '145/92', hr: 95, temp: 98.8, spo2: 95, weight: 185 }, assessment: 'Premature Ventricular Complexes', severity: 'moderate', plan: 'Holter monitor 48h. Reduce caffeine. Metoprolol 25mg BID. Cardiology referral.', allergies: 'Codeine', followUp: '1 week' },
    { patient: 'tony_stark', subjective: 'Follow-up: Holter results show occasional PVCs, no sustained arrhythmia. Feels better on beta-blocker.', vitals: { bp: '132/85', hr: 72, temp: 98.4, spo2: 97, weight: 183 }, assessment: 'Benign PVCs – Improving', severity: 'mild', plan: 'Continue Metoprolol. Stress management recommended. No high-intensity exercise until cleared.', allergies: 'Codeine', followUp: '1 month' },
    { patient: 'tony_stark', subjective: 'Patient reports elevated stress, insomnia, working excessive hours. Reports consuming 8+ coffees/day.', vitals: { bp: '148/95', hr: 88, temp: 98.6, spo2: 96, weight: 182 }, assessment: 'Stress-Induced Hypertension', severity: 'moderate', plan: 'Limit caffeine to 2 cups/day. Sleep hygiene counseling. Amlodipine 5mg daily. Recheck in 2 weeks.', allergies: 'Codeine', followUp: '2 weeks' },

    // Natasha Romanoff records
    { patient: 'natasha_romanoff', subjective: 'Annual wellness exam. Patient is very healthy and physically active. No complaints.', vitals: { bp: '115/74', hr: 58, temp: 98.0, spo2: 99, weight: 135 }, assessment: 'Annual Wellness – Fit', severity: 'mild', plan: 'All routine labs. Flu vaccine administered. Continue current regimen.', allergies: 'Latex', followUp: '1 year' },
    { patient: 'natasha_romanoff', subjective: 'Patient reports right knee pain after a training injury. Swelling noted. McMurray test positive.', vitals: { bp: '118/76', hr: 62, temp: 98.4, spo2: 98, weight: 134 }, assessment: 'Right Medial Meniscus Tear (Suspected)', severity: 'moderate', plan: 'MRI right knee ordered. RICE protocol. Naproxen 500mg BID. Crutches PRN.', allergies: 'Latex', followUp: '1 week' },

    // Barry Allen records (high metabolism arc)
    { patient: 'barry_allen', subjective: 'Patient reports extreme caloric needs (5000+ cal/day) and occasional hand tremors. Weight stable.', vitals: { bp: '108/68', hr: 42, temp: 97.8, spo2: 99, weight: 180 }, assessment: 'Hypermetabolic State – Under Investigation', severity: 'mild', plan: 'TSH, T3, T4 ordered. Nutritionist referral. High-protein high-calorie diet plan.', allergies: 'None known', followUp: '2 weeks' },
    { patient: 'barry_allen', subjective: 'Follow-up: Thyroid panel normal. Metabolism remains elevated but patient is asymptomatic and thriving.', vitals: { bp: '110/70', hr: 44, temp: 97.6, spo2: 99, weight: 181 }, assessment: 'Idiopathic Hypermetabolism – Stable', severity: 'mild', plan: 'Continue high-calorie diet. Quarterly metabolic panels. No intervention needed currently.', allergies: 'None known', followUp: '3 months' },

    // Wanda Maximoff records
    { patient: 'wanda_maximoff', subjective: 'Patient presents with severe migraine, photophobia, and reported visual aura. Duration 6+ hours.', vitals: { bp: '138/88', hr: 82, temp: 98.8, spo2: 97, weight: 130 }, assessment: 'Migraine with Aura', severity: 'severe', plan: 'Sumatriptan 100mg stat. Dark room rest. MRI brain if recurrent. Headache diary started.', allergies: 'Aspirin', followUp: '2 weeks' },
    { patient: 'wanda_maximoff', subjective: 'Follow-up for migraines. Frequency reduced to 1/month with prophylaxis. MRI brain normal.', vitals: { bp: '125/80', hr: 74, temp: 98.4, spo2: 98, weight: 131 }, assessment: 'Migraine with Aura – Well Controlled', severity: 'mild', plan: 'Continue Topiramate 50mg daily. Adequate sleep and hydration. Return PRN.', allergies: 'Aspirin', followUp: '3 months' },

    // Steve Rogers records (older patient)
    { patient: 'steve_rogers', subjective: 'Annual physical. Patient is in remarkable health for age. Very active. No chronic conditions.', vitals: { bp: '116/74', hr: 50, temp: 98.4, spo2: 99, weight: 240 }, assessment: 'Annual Physical – Excellent for Age', severity: 'mild', plan: 'Routine labs, lipid panel, PSA screening. Continue exercise regimen.', allergies: 'None known', followUp: '1 year' },
    { patient: 'steve_rogers', subjective: 'Patient reports right shoulder stiffness after heavy exercise. No acute trauma. ROM mildly restricted.', vitals: { bp: '118/76', hr: 52, temp: 98.2, spo2: 99, weight: 240 }, assessment: 'Right Shoulder Impingement', severity: 'mild', plan: 'Rotator cuff exercises. Ice after activity. NSAIDs PRN. PT referral if not improved in 4 weeks.', allergies: 'None known', followUp: '4 weeks' },

    // Selina Kyle records
    { patient: 'selina_kyle', subjective: 'Patient presents with scratches on both hands and forearms. Reports working with stray animals. Tetanus current.', vitals: { bp: '120/78', hr: 68, temp: 98.6, spo2: 98, weight: 128 }, assessment: 'Multiple Superficial Lacerations', severity: 'mild', plan: 'Wound cleaning. Topical antibiotic ointment. Monitor for signs of infection. Cat scratch disease counseling.', allergies: 'Erythromycin', followUp: '1 week' },
    { patient: 'selina_kyle', subjective: 'Follow-up: scratches healed well. Patient asks about allergy testing for cat dander. Occasional sneezing at home.', vitals: { bp: '118/76', hr: 65, temp: 98.4, spo2: 99, weight: 127 }, assessment: 'Allergic Rhinitis (Suspected Cat Dander)', severity: 'mild', plan: 'Allergy panel ordered. Cetirizine 10mg daily. HEPA filter recommended for home.', allergies: 'Erythromycin', followUp: '2 weeks' },
];

// ── Appointment templates ───────────────────────────────────
const APPOINTMENT_REASONS = [
    'Annual Physical Exam',
    'Follow-up: Blood Work Review',
    'Chronic Pain Management',
    'Pre-operative Clearance',
    'Medication Review',
    'Sports Physical',
    'Vaccination',
    'Sick Visit – Respiratory Symptoms',
    'Dermatology Concern',
    'Mental Health Check-in',
    'Follow-up: Lab Results',
    'Blood Pressure Check',
    'Cardiology Referral Follow-up',
    'Injury Assessment',
    'Wellness Consultation',
];

const TIMES = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30',
];

function formatDate(d) {
    return d.toISOString().slice(0, 10);
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ══════════════════════════════════════════════════════════════
async function runDemoGenerator() {
    console.log('═══════════════════════════════════════════════');
    console.log('  🚀 HealthChain — Rich Demo Data Generator');
    console.log('═══════════════════════════════════════════════\n');

    try {
        // ── 1. Register accounts ────────────────────────────
        console.log('── Creating Accounts ──');
        await register('dr_house', 'doctor');
        await register('dr_strange', 'doctor');
        for (const p of PATIENT_PROFILES) {
            await register(p.username, 'patient');
        }

        // ── 2. Login as Dr. House ───────────────────────────
        console.log('\n── Logging in as dr_house ──');
        const doctorToken = await login('dr_house');
        if (!doctorToken) throw new Error('Failed to get doctor token');
        console.log('  🔑 Token acquired');

        // ── 3. Update patient profiles with real names ──────
        console.log('\n── Updating Patient Profiles ──');
        for (const p of PATIENT_PROFILES) {
            try {
                const patToken = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: p.username, password: 'password123' }),
                }).then(r => r.json()).then(d => d.token);
                if (!patToken) { console.error(`  ⚠️  Could not login as ${p.username}`); continue; }
                const upd = await fetch(`${API_URL}/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patToken}` },
                    body: JSON.stringify({
                        first_name: p.first,
                        last_name:  p.last,
                        date_of_birth: p.dob,
                        gender: p.gender,
                        blood_type: p.blood,
                        phone_number: p.phone,
                        email: p.email,
                        address: p.address,
                        emergency_contact_name: p.ecName,
                        emergency_contact_phone: p.ecPhone,
                        insurance_provider: p.insurance,
                    }),
                });
                if (upd.ok) console.log(`  ✅ ${p.first} ${p.last}`);
                else console.error(`  ❌ ${p.username}:`, await upd.json());
            } catch (e) {
                console.error(`  ❌ ${p.username}: ${e.message}`);
            }
        }

        // ── 4. Get patient list ─────────────────────────────
        console.log('\n── Fetching Patients ──');
        const patientsRes = await fetch(`${API_URL}/patients?limit=100`, {
            headers: { Authorization: `Bearer ${doctorToken}` },
        });
        const patientsJson = await patientsRes.json();
        const patients = (patientsJson.data || patientsJson || []);
        
        // Ensure patients is an array
        if (!Array.isArray(patients)) {
            console.error('  ⚠️  Patients response is not an array:', patientsJson);
            console.log('  Skipping medical records generation...');
        } else {
            console.log(`  Found ${patients.length} patients`);
        }

        const getPatientId = (username) => {
            if (!Array.isArray(patients)) return null;
            const profile = PATIENT_PROFILES.find(pr => pr.username === username);
            const p = patients.find((pt) =>
                // Match by proper last name (after profile update)
                (profile && pt.last_name?.toLowerCase() === profile.last.toLowerCase()) ||
                // Fallback: username stored as last_name at registration
                pt.last_name?.toLowerCase() === username.toLowerCase()
            );
            if (!p) console.error(`  ⚠️  Patient not found: ${username}`);
            return p?.id;
        };

        // ── 5. Generate Medical Records ─────────────────────
        console.log('\n── Generating Medical Records ──');
        let recordCount = 0;
        
        if (Array.isArray(patients) && patients.length > 0) {
            for (const rec of RECORDS) {
                const patientId = getPatientId(rec.patient);
                if (!patientId) continue;
                const result = await addRecord(doctorToken, {
                    patient_id: patientId,
                    subjective: rec.subjective,
                    vitals: rec.vitals,
                    assessment: rec.assessment,
                    plan: rec.plan,
                    severity: rec.severity,
                    allergies: rec.allergies,
                    followUp: rec.followUp,
                });
                if (result !== undefined) recordCount++;
            }
            console.log(`  📊 Total records created: ${recordCount}`);
        } else {
            console.log(`  ⚠️  Skipped - no patient data available`);
        }

        // ── 6. Generate Appointments ────────────────────────
        console.log('\n── Generating Appointments ──');
        const today = new Date();
        const patientIds = PATIENT_PROFILES.map((p) => getPatientId(p.username)).filter(Boolean);

        let apptCount = 0;

        // Past appointments (last 4 weeks — completed & some no-shows/cancelled)
        for (let daysAgo = 28; daysAgo >= 1; daysAgo--) {
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);
            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            // 2-4 appointments per past weekday
            const numAppts = 2 + Math.floor(Math.random() * 3);
            const usedTimes = new Set();
            for (let i = 0; i < numAppts; i++) {
                let time;
                let attempts = 0;
                do {
                    time = randomItem(TIMES);
                    attempts++;
                } while (usedTimes.has(time) && attempts < 20);
                usedTimes.add(time);

                const patientId = randomItem(patientIds);
                const apptId = await bookAppointment(doctorToken, {
                    patient_id: patientId,
                    appointment_date: formatDate(date),
                    appointment_time: time,
                    reason_for_visit: randomItem(APPOINTMENT_REASONS),
                });
                if (apptId) {
                    apptCount++;
                    // Mark most past appointments as Completed, a few as Cancelled/No-Show
                    const roll = Math.random();
                    const status = roll < 0.8 ? 'Completed' : roll < 0.9 ? 'Cancelled' : 'No-Show';
                    await updateAppointmentStatus(doctorToken, apptId, status);
                }
            }
        }

        // Today's appointments (make the schedule look busy)
        if (today.getDay() !== 0 && today.getDay() !== 6) {
            const todayTimes = ['08:30', '09:00', '10:00', '11:00', '13:30', '14:00', '15:00', '16:00'];
            for (const time of todayTimes) {
                const patientId = randomItem(patientIds);
                const apptId = await bookAppointment(doctorToken, {
                    patient_id: patientId,
                    appointment_date: formatDate(today),
                    appointment_time: time,
                    reason_for_visit: randomItem(APPOINTMENT_REASONS),
                });
                if (apptId) {
                    apptCount++;
                    // Mark morning ones as Completed, afternoon as Scheduled
                    const hour = parseInt(time.split(':')[0]);
                    if (hour < new Date().getHours()) {
                        await updateAppointmentStatus(doctorToken, apptId, 'Completed');
                    }
                }
            }
        }

        // Future appointments (next 4 weeks)
        for (let daysAhead = 1; daysAhead <= 28; daysAhead++) {
            const date = new Date(today);
            date.setDate(date.getDate() + daysAhead);
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const numAppts = 2 + Math.floor(Math.random() * 3);
            const usedTimes = new Set();
            for (let i = 0; i < numAppts; i++) {
                let time;
                let attempts = 0;
                do {
                    time = randomItem(TIMES);
                    attempts++;
                } while (usedTimes.has(time) && attempts < 20);
                usedTimes.add(time);

                const patientId = randomItem(patientIds);
                await bookAppointment(doctorToken, {
                    patient_id: patientId,
                    appointment_date: formatDate(date),
                    appointment_time: time,
                    reason_for_visit: randomItem(APPOINTMENT_REASONS),
                });
                apptCount++;
            }
        }

        console.log(`  📊 Total appointments created: ${apptCount}`);

        // ── 7. Summary ──────────────────────────────────────
        console.log('\n═══════════════════════════════════════════════');
        console.log('  🎉 DEMO DATA GENERATION COMPLETE!');
        console.log(`  👨‍⚕️  Doctors: 2`);
        console.log(`  🧑‍🤝‍🧑  Patients: ${PATIENT_PROFILES.length}`);
        console.log(`  🏥 Records: ${recordCount}`);
        console.log(`  📅 Appointments: ${apptCount}`);
        console.log('  🔐 Login: dr_house / password123');
        console.log('═══════════════════════════════════════════════\n');
    } catch (err) {
        console.error('❌ Fatal error:', err);
    }
}

runDemoGenerator();