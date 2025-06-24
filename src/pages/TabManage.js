import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper, Typography, Box, IconButton,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogActions,
  DialogContent, DialogTitle, TextField, Button,
  Grid, Snackbar, Alert, CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchAppointmentsByDateAndByLocation, updateAppointment, deleteAppointment } from '../api/userApi';
import { useAuth } from '../context/AuthContext';

const TabManage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const { user } = useAuth();
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);

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


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h5" gutterBottom>
          Manage Appointments
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <DatePicker
            label="Appointment Date"
            value={selectedDate}
            onChange={handleDateChange}
            sx={{ width: 220 }}
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
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogContent>
            {currentAppointment && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Patient Name"
                    name="patient_name"
                    value={currentAppointment.patient_name || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    type="tel"
                    name="phone"
                    value={currentAppointment.phone || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Status"
                    name="status"
                    value={currentAppointment.status || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Amount"
                    name="amount"
                    type="number"
                    value={currentAppointment.amount || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Diagnosis"
                    name="diagnosis"
                    multiline
                    rows={2}
                    value={currentAppointment.diagnosis || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    multiline
                    rows={3}
                    value={currentAppointment.notes || ''}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSaveChanges} variant="contained" color="primary" disabled={isSavingAppointment}>
              Save Changes
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

export default TabManage;