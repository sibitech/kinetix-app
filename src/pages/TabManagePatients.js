import React, { useState, useEffect } from 'react';
import {
  Paper, Typography, Box, Button, IconButton,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogActions,
  DialogContent, DialogTitle, TextField, 
  Snackbar, Alert, CircularProgress, Grid,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import { fetchAllPatients, addPatient, updatePatient, deletePatient } from '../api/userApi';

const TabManagePatients = () => {
  // States for patients list and operations
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [currentPatient, setCurrentPatient] = useState({
    name: '',
    phone: '',
    sex: '',
    dob: null,
    email: '',
    address: '',
    medical_history: ''
  });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const { user } = useAuth();

  // Fetch patients when component mounts
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await fetchAllPatients();
      setPatients(data);
    } catch (error) {
      setNotification({
        open: true,
        message: 'Failed to load patients',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    // If birthday hasn't occurred yet this year, subtract 1
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Handle actions for adding, editing, and deleting
  const handleAddNewClick = () => {
    setCurrentPatient({
      name: '',
      phone: '',
      sex: '',
      dob: null,
      email: '',
      address: '',
      medical_history: ''
    });
    setIsNewPatient(true);
    setOpenDialog(true);
  };

  const handleEditClick = (patient) => {
    setCurrentPatient({ ...patient });
    setIsNewPatient(false);
    setOpenDialog(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try {
        const result = await deletePatient(id);
        
        if (result.success) {
          setPatients(patients.filter(patient => patient.id !== id));
          setNotification({
            open: true,
            message: 'Patient deleted successfully',
            severity: 'success'
          });
        } else {
          setNotification({
            open: true,
            message: result.error || 'Failed to delete patient',
            severity: 'error'
          });
        }
      } catch (error) {
        setNotification({
          open: true,
          message: 'Failed to delete patient',
          severity: 'error'
        });
      }
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsSavingPatient(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentPatient(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date) => {
    setCurrentPatient(prev => ({
      ...prev,
      dob: date
    }));
  };

  const handleSavePatient = async () => {
    if (isSavingPatient) return;
    try {
      setIsSavingPatient(true);
      
      let result;
      if (isNewPatient) {
        result = await addPatient(currentPatient);
      } else {
        result = await updatePatient(currentPatient);
      }

      if (result.success) {
        await loadPatients(); // Reload all patients
        setNotification({
          open: true,
          message: `Patient ${isNewPatient ? 'added' : 'updated'} successfully`,
          severity: 'success'
        });
        handleCloseDialog();
      } else {
        setIsSavingPatient(false);
        setNotification({
          open: true,
          message: result.error || `Failed to ${isNewPatient ? 'add' : 'update'} patient`,
          severity: 'error'
        });
      }
    } catch (error) {
      setIsSavingPatient(false);
      setNotification({
        open: true,
        message: `Failed to ${isNewPatient ? 'add' : 'update'} patient`,
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%', p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Manage Patients
        </Typography>

        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddNewClick}
          >
            Add New Patient
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : patients.length === 0 ? (
          <Typography>No patients found. Add your first patient using the button above.</Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Actions</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Sex</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <IconButton onClick={() => handleEditClick(patient)} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteClick(patient.id)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell>{patient.name}</TableCell>
                    <TableCell>{calculateAge(patient.dob)}</TableCell>
                    <TableCell>{patient.sex}</TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add/Edit Patient Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{isNewPatient ? 'Add New Patient' : 'Edit Patient'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Patient Name"
                  name="name"
                  value={currentPatient.name || ''}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={currentPatient.phone || ''}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Sex</InputLabel>
                  <Select
                    name="sex"
                    value={currentPatient.sex || ''}
                    onChange={handleInputChange}
                    label="Sex"
                  >
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date of Birth"
                  value={currentPatient.dob}
                  onChange={handleDateChange}
                  disableFuture
                  sx={{ width: '100%' }}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={currentPatient.email || ''}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={currentPatient.address || ''}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Medical History"
                  name="medical_history"
                  multiline
                  rows={3}
                  value={currentPatient.medical_history || ''}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSavePatient} variant="contained" color="primary" disabled={isSavingPatient}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseNotification} severity={notification.severity}>
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default TabManagePatients;