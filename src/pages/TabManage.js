import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper, Typography, Box, IconButton,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogActions,
  DialogContent, DialogTitle, TextField, Button,
  FormControl, InputLabel, Select, MenuItem,
  Grid, Snackbar, Alert, CircularProgress,
  Stack, Autocomplete, Divider, ListItem, ListItemText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchAppointmentsByDateAndByLocation, updateAppointment, deleteAppointment, persistAppointment, searchPatientsByPhone } from '../api/userApi';
import { useAuth } from '../context/AuthContext';
import PatientFormDialog from '../components/PatientFormDialog';

const TabManage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const { user } = useAuth();
  const [openBookDialog, setOpenBookDialog] = useState(false);
  // Booking form state (from TabBook.js)
  const [bookForm, setBookForm] = useState({
    phone: '',
    name: '',
    patient_id: null,
    datetime: '',
    notes: ''
  });
  const [bookErrors, setBookErrors] = useState({});
  const [bookNotification, setBookNotification] = useState({ open: false, message: '', severity: 'success' });
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);

  // Memoized function to fetch appointments (always use clinic_id 1)
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAppointmentsByDateAndByLocation(selectedDate, 1);
      setAppointments(data);
    } catch (error) {
      setNotification({
        open: true,
        message: 'Failed to load appointments',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Fetch appointments when date changes
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Handle date change
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  // Open edit dialog
  const handleEditClick = (appointment) => {
    setCurrentAppointment({ ...appointment });
    setOpenDialog(true);
  };

  // Close edit dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentAppointment(null);
    setIsSavingAppointment(false);
  };

  // Handle input changes in the edit dialog
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentAppointment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save appointment changes (always use clinic_id 1)
  const handleSaveChanges = async () => {
    if (isSavingAppointment) return;
    try {
      const currentUser = user?.displayName;
      setIsSavingAppointment(true);
      // Prepare payload for API
      const payload = {
        id: currentAppointment.id,
        patientName: currentAppointment.patient_name,
        phoneNumber: currentAppointment.phone,
        status: currentAppointment.status,
        diagnosis: currentAppointment.diagnosis,
        notes: currentAppointment.notes,
        amount: currentAppointment.amount,
        paymentMode: currentAppointment.payment_mode,
        updated_by: currentUser,
        clinic_id: 1,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const result = await updateAppointment(payload);

      if (result.success) {
        // Create updated appointment with the clinic location name (hardcoded as 'Clinic 1')
        const updatedAppointment = {
          ...currentAppointment,
          clinic_location: 'Clinic 1',
          clinic_id: 1
        };
        // Update the appointments list with updated data
        setAppointments(appointments.map(app =>
          app.id === currentAppointment.id ? updatedAppointment : app
        ));

        setNotification({
          open: true,
          message: 'Appointment updated successfully',
          severity: 'success'
        });

        handleCloseDialog();
        // Then reload the appointments data
        await loadAppointments();
        if (window.refreshDashboardCards) window.refreshDashboardCards();
      } else {
        setNotification({
          open: true,
          message: result.error || 'Failed to update appointment',
          severity: 'error'
        });
        setIsSavingAppointment(false);
      }
    } catch (error) {
      setIsSavingAppointment(false);
      setNotification({
        open: true,
        message: 'Failed to update appointment',
        severity: 'error'
      });
    }
  };

  // Delete appointment
  const handleDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        const result = await deleteAppointment(id);

        if (result.success) {
          setAppointments(appointments.filter(app => app.id !== id));

          setNotification({
            open: true,
            message: 'Appointment deleted successfully',
            severity: 'success'
          });
          if (window.refreshDashboardCards) window.refreshDashboardCards();
        } else {
          setNotification({
            open: true,
            message: result.error || 'Failed to delete appointment',
            severity: 'error'
          });
        }
      } catch (error) {
        setNotification({
          open: true,
          message: 'Failed to delete appointment',
          severity: 'error'
        });
      }
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Format time for display (convert from UTC to user's local timezone)
  const formatTime = (isoString) => {
    if (!isoString) return '';

    // Get user's timezone dynamically from browser
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimeZone
    });
  };

  // --- Book Appointment logic (from TabBook.js) ---
  const searchPatients = useCallback(async (phoneNumber) => {
    if (phoneNumber.length < 3) {
      setPatientSuggestions([]);
      setOpenSuggestions(false);
      return;
    }
    try {
      setLoadingPatients(true);
      const patients = await searchPatientsByPhone(phoneNumber);
      if (phoneNumber.length >= 3) {
        const allOptions = [
          ...patients,
          { id: 'create-new', name: 'Create New Patient', phone: phoneNumber }
        ];
        setPatientSuggestions(allOptions);
        setOpenSuggestions(true);
      } else {
        setPatientSuggestions(patients);
        setOpenSuggestions(patients.length > 0);
      }
    } catch (error) {
      // ignore
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const handleBookPhoneChange = (e) => {
    const phoneNumber = e.target.value;
    setBookForm(prev => ({ ...prev, phone: phoneNumber }));
    const timer = setTimeout(() => {
      searchPatients(phoneNumber);
    }, 300);
    return () => clearTimeout(timer);
  };

  const handleBookPatientSelect = (event, patient) => {
    if (patient) {
      setSelectedPatient(patient);
      setBookForm(prev => ({
        ...prev,
        name: patient.name,
        patient_id: patient.id,
        phone: patient.phone || prev.phone
      }));
      setOpenSuggestions(false);
      setPatientSuggestions([]);
    } else {
      setSelectedPatient(null);
      setBookForm(prev => ({ ...prev, name: '', patient_id: null }));
    }
  };

  const handleBookChange = (e) => {
    setBookForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateBook = () => {
    const newErrors = {};
    if (!bookForm.name.trim()) newErrors.name = 'Required';
    if (bookForm.name.length > 100) newErrors.name = 'Max 100 characters';
    if (!bookForm.phone) newErrors.phone = 'Required';
    if (bookForm.phone && !/^[6-9]\d{9}$/.test(bookForm.phone)) newErrors.phone = 'Invalid Indian number';
    if (!bookForm.datetime) newErrors.datetime = 'Required';
    return newErrors;
  };

  const handleBookSubmit = async (e) => {
    if (isSavingAppointment) return;
    e.preventDefault();
    const validationErrors = validateBook();
    setBookErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    const currentUser = user?.displayName;
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const payload = {
      ...bookForm,
      clinicLocation: 1,
      status: 'scheduled',
      updated_at: new Date().toISOString(),
      updated_by: currentUser,
      timeZone: userTimeZone
    };
    try {
      setIsSavingAppointment(true);
      const success = await persistAppointment(payload);
      setBookNotification({
        open: true,
        message: success ? 'Appointment saved successfully.' : 'Failed to save appointment.',
        severity: success ? 'success' : 'error'
      });
      if (success) {
        setBookForm({ phone: '', name: '', patient_id: null, datetime: '', notes: '' });
        setSelectedPatient(null);
        setPatientSuggestions([]);
        setIsSavingAppointment(false);
        setOpenBookDialog(false);
        await loadAppointments();
        if (window.refreshDashboardCards) window.refreshDashboardCards();
      }
    } catch (error) {
      setBookNotification({ open: true, message: 'Failed to save appointment.', severity: 'error' });
      setIsSavingAppointment(false);
    }
  };

  const handleBookCloseNotification = (event, reason) => {
    if (reason === 'clickaway') return;
    setBookNotification({ ...bookNotification, open: false });
  };

  const handleCreateNewPatient = () => {
    setOpenSuggestions(false);
    setPatientSuggestions([]);
    setTimeout(() => {
      setShowPatientForm(true);
    }, 50);
  };

  const handlePatientAdded = (newPatient) => {
    setShowPatientForm(false);
    setSelectedPatient(newPatient);
    setBookForm(prev => ({
      ...prev,
      name: newPatient.name,
      patient_id: newPatient.id,
      phone: newPatient.phone || prev.phone
    }));
    setBookNotification({ open: true, message: 'Patient added successfully', severity: 'success' });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h5" gutterBottom>
          Manage Appointments
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpenBookDialog(true)}
          >
            Book Appointment
          </Button>
        </Box>

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <DatePicker
            label="Appointment Date"
            value={selectedDate}
            onChange={handleDateChange}
            sx={{ width: 220 }}
            format="dd/MM/yyyy"
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : appointments.length === 0 ? (
          <Typography>No appointments for this date.</Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Actions</TableCell>
                  <TableCell>Patient Name</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <IconButton onClick={() => handleEditClick(appointment)} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteClick(appointment.id)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell>{appointment.patient_name}</TableCell>
                    <TableCell>{formatTime(appointment.appointment_time)}</TableCell>
                    <TableCell>{appointment.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Edit Appointment Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handleBookSubmit} noValidate sx={{ maxWidth: 400, mx: 'auto' }}>
              <Stack spacing={2}>
            {currentAppointment && (
              
                  <><TextField
                      fullWidth
                      label="Phone Number"
                      type="tel"
                      name="phone"
                      value={currentAppointment.phone || ''}
                      onChange={handleInputChange} />
                  <TextField
                    fullWidth
                    label="Patient Name"
                    name="patient_name"
                    value={currentAppointment.patient_name || ''}
                    onChange={handleInputChange} />
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        name="status"
                        value={currentAppointment.status || ''}
                        onChange={handleInputChange}
                        label="Status"
                      >
                        <MenuItem value="scheduled">Scheduled</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Payment Mode</InputLabel>
                      <Select
                        name="payment_mode"
                        value={currentAppointment.payment_mode || ''}
                        onChange={handleInputChange}
                        label="Payment Mode"
                      >
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="online">Online</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="Amount"
                      name="amount"
                      type="number"
                      value={currentAppointment.amount || ''}
                      onChange={handleInputChange} /><TextField
                      fullWidth
                      label="Diagnosis"
                      name="diagnosis"
                      multiline
                      rows={2}
                      value={currentAppointment.diagnosis || ''}
                      onChange={handleInputChange} /><TextField
                      fullWidth
                      label="Notes"
                      name="notes"
                      multiline
                      rows={3}
                      value={currentAppointment.notes || ''}
                      onChange={handleInputChange} /></>
                
            )}
            </Stack>  
            </Box>
          
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSaveChanges} variant="contained" color="primary" disabled={isSavingAppointment}>
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Book Appointment Dialog */}
        <Dialog open={openBookDialog} onClose={() => setOpenBookDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Book Appointment</DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handleBookSubmit} noValidate sx={{ maxWidth: 400, mx: 'auto' }}>
              <Stack spacing={2}>
                {/* Phone number field first for patient lookup */}
                <TextField
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={bookForm.phone}
                  onChange={handleBookPhoneChange}
                  error={!!bookErrors.phone}
                  helperText={bookErrors.phone || "Enter phone number to find existing patients"}
                  fullWidth
                  required
                />
                {/* Patient selector with autocomplete and create new option */}
                <Autocomplete
                  options={patientSuggestions}
                  getOptionLabel={(option) => `${option.name} (${option.phone || 'No phone'})`}
                  loading={loadingPatients}
                  value={selectedPatient}
                  onChange={handleBookPatientSelect}
                  isOptionEqualToValue={(option, value) => option.id === value?.id}
                  open={openSuggestions}
                  onOpen={() => {
                    if (patientSuggestions.length > 0) {
                      setOpenSuggestions(true);
                    }
                  }}
                  onClose={() => setOpenSuggestions(false)}
                  noOptionsText="No matching patients found"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Patient"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingPatients ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => {
                    if (option.id === 'create-new') {
                      return (
                        <React.Fragment key="create-new">
                          <Divider />                          
                        </React.Fragment>
                      );
                    }
                    return (
                      <ListItem {...props} key={option.id}>
                        <ListItemText 
                          primary={option.name} 
                          secondary={`Phone: ${option.phone || 'N/A'}`} 
                        />
                      </ListItem>
                    );
                  }}
                />
                
                {/* Date and time field */}
                <TextField
                  label="Appointment Date & Time"
                  name="datetime"
                  type="datetime-local"
                  value={bookForm.datetime}
                  onChange={handleBookChange}
                  error={!!bookErrors.datetime}
                  helperText={bookErrors.datetime}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                {/* Notes field */}
                <TextField
                  label="Notes"
                  name="notes"
                  value={bookForm.notes}
                  onChange={handleBookChange}
                  multiline
                  rows={3}
                  fullWidth
                />
                <Button type="submit" variant="contained" color="primary" disabled={isSavingAppointment}>
                  Submit
                </Button>
              </Stack>
            </Box>
            <Snackbar
              open={bookNotification.open}
              autoHideDuration={5000}
              onClose={handleBookCloseNotification}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
              <Alert onClose={handleBookCloseNotification} severity={bookNotification.severity} sx={{ width: '100%' }}>
                {bookNotification.message}
              </Alert>
            </Snackbar>
            {/* Patient Creation Dialog */}
            <PatientFormDialog 
              open={showPatientForm}
              onClose={() => setShowPatientForm(false)}
              onPatientAdded={handlePatientAdded}
              initialPhoneNumber={bookForm.phone}
            />
          </DialogContent>
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

export default TabManage;