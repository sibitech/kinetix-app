const { getAllPatients, getPatientById, addPatient, updatePatient, deletePatient, searchPatientsByPhone } = require('./db');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.body;

    switch (action) {
      case 'get-all-patients':
        return handleGetAllPatients(req, res);
      case 'get-patient':
        return handleGetPatient(req, res);
      case 'add-patient':
        return handleAddPatient(req, res);
      case 'update-patient':
        return handleUpdatePatient(req, res);
      case 'delete-patient':
        return handleDeletePatient(req, res);
      case 'search-by-phone':
        return handleSearchByPhone(req, res);      
      default:
        return res.status(400).json({ error: 'Invalid action specified' });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all patients
async function handleGetAllPatients(req, res) {
  try {
    const patients = await getAllPatients();
    return res.status(200).json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return res.status(500).json({ error: 'Failed to fetch patients' });
  }
}

// Get specific patient
async function handleGetPatient(req, res) {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Patient ID is required' });
  }
  
  try {
    const patient = await getPatientById(id);
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    return res.status(200).json({ patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return res.status(500).json({ error: 'Failed to fetch patient' });
  }
}

// Add new patient
async function handleAddPatient(req, res) {
  const { name, phone, sex, dob, email, address, medical_history } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Patient name is required' });
  }
  
  try {
    const patientData = {
      name,
      phone,
      sex,
      dob,
      email,
      address,
      medical_history
    };
    
    const newPatient = await addPatient(patientData);
    return res.status(201).json({ success: true, patient: newPatient });
  } catch (error) {
    console.error('Error adding patient:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to add patient' });
  }
}

// Update existing patient
async function handleUpdatePatient(req, res) {
  const { id, name, phone, sex, dob, email, address, medical_history } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Patient ID is required' });
  }
  
  if (!name) {
    return res.status(400).json({ error: 'Patient name is required' });
  }
  
  try {
    const patientData = {
      id,
      name,
      phone,
      sex,
      dob,
      email,
      address,
      medical_history
    };
    
    const updatedPatient = await updatePatient(patientData);
    
    if (!updatedPatient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    
    return res.status(200).json({ success: true, patient: updatedPatient });
  } catch (error) {
    console.error('Error updating patient:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to update patient' });
  }
}

// Delete patient
async function handleDeletePatient(req, res) {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Patient ID is required' });
  }
  
  try {
    const deleted = await deletePatient(id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to delete patient' });
  }
}

// Search patients by phone number
async function handleSearchByPhone(req, res) {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  
  try {
    const patients = await searchPatientsByPhone(phone);
    return res.status(200).json({ patients });
  } catch (error) {
    console.error('Error searching patients by phone:', error);
    return res.status(500).json({ error: 'Failed to search patients' });
  }
}