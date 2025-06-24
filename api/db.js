import { DateTime } from 'luxon';
const { Pool } = require('pg');

// Create a PostgreSQL connection pool
let pool;

// Initialize the database connection
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

// Check if a user is allowed
async function getUserByEmail(email) {
  try {
    const client = await getPool().connect();
    try {
      const query = 'SELECT * FROM kx_allowed_users WHERE email = $1';
      const result = await client.query(query, [email]);
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
}

async function getClinicLocations() {
  try {
    const client = await getPool().connect();
    try {
      const query = 'SELECT id, name FROM kx_clinic_locations';
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
}

async function persistAppointment(payload) {
  try {
    const client = await getPool().connect();
    try {
      const {
        datetime,
        name,
        clinicLocation,
        phone,
        notes,
        updated_by,
        timeZone,
        patient_id
      } = payload;

      const now = DateTime.fromISO(new Date().toISOString(), { zone: timeZone }).toUTC().toISO();
      const utcDatetime = DateTime.fromISO(datetime, { zone: timeZone }).toUTC().toISO();

      // If we have a patient_id, use that as a foreign key
      if (patient_id) {
        const query = `
          INSERT INTO kx_appointments 
            (appointmaent_date_time, status, patient_name, clinic_location, updated_at, updated_by, patient_phone_number, diagnosis, notes, patient_id)
          VALUES 
            ($1, 'scheduled', $2, $3, $4, $5, $6, '', $7, $8)
        `;

        await client.query(query, [
          utcDatetime,
          name,
          clinicLocation,
          now,
          updated_by,
          phone || null,
          notes || '',
          patient_id
        ]);
      } else {
        // Backward compatibility for appointments without patient_id
        const query = `
          INSERT INTO kx_appointments 
            (appointmaent_date_time, status, patient_name, clinic_location, updated_at, updated_by, patient_phone_number, diagnosis, notes)
          VALUES 
            ($1, 'scheduled', $2, $3, $4, $5, $6, '', $7)
        `;

        await client.query(query, [
          utcDatetime,
          name,
          clinicLocation,
          now,
          updated_by,
          phone || null,
          notes || ''
        ]);
      }

      return { success: true };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error inserting appointment:', error);
    return { success: false };
  }
}
// Function to get appointments by date
async function fetchAppointmentsByDateAndByLocation(date, timeZone, location) {
  try {
    const client = await getPool().connect();
    try {
      // Format date properly - ensure it's a string in YYYY-MM-DD format
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

      // Parse the date string in the user's timezone at start of day
      const startDate = DateTime.fromISO(dateStr, { zone: timeZone }).startOf('day').toUTC().toJSDate();

      // Parse the date string in the user's timezone at end of day
      const endDate = DateTime.fromISO(dateStr, { zone: timeZone }).endOf('day').toUTC().toJSDate();


      // Define common columns to avoid duplication
      const commonColumns = `
        appointment.id,
        appointmaent_date_time as appointment_time,
        status,
        patient_name,
        updated_at,
        updated_by,
        patient_phone_number as phone,
        diagnosis,
        notes,
        amount,
        kx_clinic_locations.name as clinic_location,
        kx_clinic_locations.id as clinic_id
      `;

      let query;
      let params;

      if (!location) {
        // If no location specified, fetch all appointments for the date
        query = `
          SELECT ${commonColumns}
          FROM kx_appointments as appointment
          JOIN kx_clinic_locations ON kx_clinic_locations.id = appointment.clinic_location        
          WHERE appointmaent_date_time BETWEEN $1 AND $2
          ORDER BY appointmaent_date_time ASC
        `;
        params = [startDate.toISOString(), endDate.toISOString()];
      } else {
        // If location is specified, join with kx_clinic_locations and filter by location name
        query = `
          SELECT 
            ${commonColumns}
          FROM kx_appointments as appointment
          JOIN kx_clinic_locations ON kx_clinic_locations.id = appointment.clinic_location                 
          WHERE 
            appointmaent_date_time BETWEEN $1 AND $2 AND
            kx_clinic_locations.id = $3
          ORDER BY appointmaent_date_time ASC
        `;
        params = [startDate.toISOString(), endDate.toISOString(), location];
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

// Function to update an appointment
async function updateAppointment(payload) {
  try {
    const client = await getPool().connect();
    try {
      const {
        id,
        patientName,
        phoneNumber,
        status,
        diagnosis,
        notes,
        amount,
        updated_by, // Assuming this is the current user
        clinic_id,
        timeZone
      } = payload;

      const now = DateTime.fromISO(new Date().toISOString(), { zone: timeZone }).toUTC().toISO();

      const query = `
        UPDATE kx_appointments
        SET 
          patient_name = $1,
          patient_phone_number = $2,
          status = $3,
          diagnosis = $4,
          notes = $5,
          amount = $6,
          updated_at = $7,
          updated_by = $8,
          clinic_location = $9
        WHERE 
          id = $10
        RETURNING id
      `;

      const result = await client.query(query, [
        patientName,
        phoneNumber || null,
        status || 'scheduled',
        diagnosis || '',
        notes || '',
        amount || 0,
        now,
        updated_by,
        clinic_id,
        id
      ]);

      if (result.rowCount === 0) {
        return { success: false, error: 'Appointment not found' };
      }

      return { success: true, data: { id: result.rows[0].id } };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { success: false, error: 'Database error' };
  }
}

// Function to delete an appointment
async function deleteAppointment(id) {
  try {
    const client = await getPool().connect();
    try {
      const query = `
        DELETE FROM kx_appointments
        WHERE id = $1
        RETURNING id
      `;

      const result = await client.query(query, [id]);

      if (result.rowCount === 0) {
        return { success: false, error: 'Appointment not found' };
      }

      return { success: true };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return { success: false, error: 'Database error' };
  }
}

// Add user to allowlist
async function addAllowedUser(email, isAdmin) {
  try {
    const client = await getPool().connect();
    try {
      const query = `
        INSERT INTO kx_allowed_users (email, is_admin) 
        VALUES ($1, $2) 
        ON CONFLICT (email) DO NOTHING
        RETURNING *
      `;
      const result = await client.query(query, [email, isAdmin]);
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
}
async function updateAllowedUser(id, email, isAdmin) {
  try {
    const client = await getPool().connect();
    try {
      const query = `
        UPDATE kx_allowed_users
        SET email = $2, is_admin = $3
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query(query, [id, email, isAdmin]);
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
}

async function deleteAllowedUser(id) {
  try {
    const client = await getPool().connect();
    try {
      const query = `
        DELETE FROM kx_allowed_users
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query(query, [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
}


// List all allowed users
async function getAllUsers() {
  try {
    const client = await getPool().connect();
    try {
      const query = 'SELECT * FROM kx_allowed_users ORDER BY created_at DESC';
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
}

// Get all patients
async function getAllPatients() {
  try {
    const client = await getPool().connect();
    try {
      const query = 'SELECT * FROM kx_patients ORDER BY name';
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
}

// Get specific patient by ID
async function getPatientById(id) {
  try {
    const client = await getPool().connect();
    try {
      const query = 'SELECT * FROM kx_patients WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rows[0]; // Returns undefined if no patient found
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
}

// Add a new patient
async function addPatient(patientData) {
  try {
    const client = await getPool().connect();
    try {
      const {
        name,
        phone,
        sex,
        dob,
        email,
        address,
        medical_history
      } = patientData;
      
      const query = `
        INSERT INTO kx_patients (name, dob, sex, email, phone, address, created_at, medical_history)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        name,
        dob,
        sex,
        email || null,
        phone || null,
        address || null,
        medical_history || null
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error: ' + error.message);
  }
}

// Update existing patient
async function updatePatient(patientData) {
  try {
    const client = await getPool().connect();
    try {
      const {
        id,
        name,
        phone,
        sex,
        dob,
        email,
        address,
        medical_history
      } = patientData;
      
      const query = `
        UPDATE kx_patients
        SET 
          name = $1,
          dob = $2,
          sex = $3,
          email = $4,
          phone = $5,
          address = $6,
          medical_history = $7
        WHERE id = $8
        RETURNING *
      `;
      
      const result = await client.query(query, [
        name,
        dob,
        sex,
        email || null,
        phone || null,
        address || null,
        medical_history || null,
        id
      ]);
      
      return result.rows[0]; // Returns undefined if no patient found
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error: ' + error.message);
  }
}

// Delete patient
async function deletePatient(id) {
  try {
    const client = await getPool().connect();
    try {
      const query = `
        DELETE FROM kx_patients
        WHERE id = $1
        RETURNING id
      `;
      
      const result = await client.query(query, [id]);
      return result.rowCount > 0; // Returns true if a patient was deleted
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
}

// Search patients by phone number
async function searchPatientsByPhone(phoneNumber) {
  try {
    const client = await getPool().connect();
    try {
      // Using LIKE to do a partial match on phone number
      const query = `
        SELECT * FROM kx_patients 
        WHERE phone LIKE $1
        ORDER BY name
        LIMIT 5
      `;
      const result = await client.query(query, [`%${phoneNumber}%`]);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database error');
  }
}

module.exports = {
  getUserByEmail,
  getAllUsers,
  addAllowedUser,
  updateAllowedUser,
  deleteAllowedUser,
  persistAppointment,
  fetchAppointmentsByDateAndByLocation,
  updateAppointment,
  deleteAppointment,
  getClinicLocations,
  // Patient functions
  getAllPatients,
  getPatientById,
  addPatient,
  updatePatient,
  deletePatient,
  searchPatientsByPhone
};