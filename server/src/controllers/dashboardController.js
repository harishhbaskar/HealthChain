// =========================================================
// Dashboard Controller – Phase 4: Stats & Activity Feed
// =========================================================
const db = require('../config/db');
const promiseDb = db.promise();

// GET /api/dashboard/stats
// Returns: { stats: {...}, todaySchedule: [...], recentActivity: [...] }
exports.getStats = async (req, res) => {
  try {
    // Resolve doctor profile
    const [docRows] = await promiseDb.execute(
      'SELECT id, first_name, last_name FROM doctors WHERE user_id = ?',
      [req.userId]
    );

    if (docRows.length === 0) {
      return res.status(403).json({ error: 'No doctor profile linked to this account.' });
    }

    const doctor = docRows[0];
    const doctorId = doctor.id;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // ---- Run all stat queries in parallel ----
    const [
      [todayAppts],
      [upcomingAppts],
      [completedWeek],
      [totalPatients],
      [todaySchedule],
      [recentActivity],
    ] = await Promise.all([
      // 1. Today's appointments count
      promiseDb.execute(
        `SELECT COUNT(*) AS count FROM appointments
         WHERE doctor_id = ? AND appointment_date = ? AND status = 'Scheduled'`,
        [doctorId, today]
      ),

      // 2. Upcoming appointments count (today + future, scheduled only)
      promiseDb.execute(
        `SELECT COUNT(*) AS count FROM appointments
         WHERE doctor_id = ? AND appointment_date >= ? AND status = 'Scheduled'`,
        [doctorId, today]
      ),

      // 3. Completed this week
      promiseDb.execute(
        `SELECT COUNT(*) AS count FROM appointments
         WHERE doctor_id = ? AND status = 'Completed'
           AND appointment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
        [doctorId]
      ),

      // 4. Total patients (distinct patients who have visits or appointments with this doctor)
      promiseDb.execute(
        `SELECT COUNT(DISTINCT patient_id) AS count FROM (
           SELECT patient_id FROM visits WHERE doctor_id = ?
           UNION
           SELECT patient_id FROM appointments WHERE doctor_id = ?
         ) AS combined`,
        [doctorId, doctorId]
      ),

      // 5. Today's schedule (up to 6 entries)
      promiseDb.execute(
        `SELECT
           a.id, a.appointment_time, a.reason_for_visit, a.status,
           p.first_name AS patient_first_name,
           p.last_name  AS patient_last_name
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status = 'Scheduled'
         ORDER BY a.appointment_time ASC
         LIMIT 6`,
        [doctorId, today]
      ),

      // 6. Recent activity feed (last 10 audit log entries for this user)
      promiseDb.execute(
        `SELECT al.id, al.action_type, al.details, al.timestamp, u.username
         FROM audit_logs al
         JOIN users u ON al.user_id = u.id
         WHERE al.user_id = ?
         ORDER BY al.timestamp DESC
         LIMIT 10`,
        [req.userId]
      ),
    ]);

    res.json({
      doctor: {
        first_name: doctor.first_name,
        last_name: doctor.last_name,
      },
      stats: {
        todayAppointments: todayAppts[0].count,
        completedThisWeek: completedWeek[0].count,
        totalPatients: totalPatients[0].count,
        upcomingAppointments: upcomingAppts[0].count,
      },
      todaySchedule,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        type: a.action_type,
        details: a.details,
        timestamp: a.timestamp,
        username: a.username,
      })),
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
};
