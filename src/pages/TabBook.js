import React, { useState, useCallback } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Stack,
    CircularProgress,
    Snackbar,
    Alert,
    Autocomplete,
    ListItem,
    ListItemText,
    Divider
} from '@mui/material';
import { persistAppointment, searchPatientsByPhone } from '../api/userApi';
import { useAuth } from '../context/AuthContext';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PatientFormDialog from '../components/PatientFormDialog';

const TabBook = () => {
    const [form, setForm] = useState({
        phone: '',
        name: '',
        patient_id: null, // New field to store patient ID
        datetime: '',
        notes: ''
    });

    const [errors, setErrors] = useState({});
    const [submitMsg, setSubmitMsg] = useState('');
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
    const { user } = useAuth();
    const [isSavingAppointment, setIsSavingAppointment] = useState(false);
    
    // New state for patient suggestions
    const [patientSuggestions, setPatientSuggestions] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    // New state to control the dropdown visibility
    const [openSuggestions, setOpenSuggestions] = useState(false);
    // New state for patient creation modal
    const [showPatientForm, setShowPatientForm] = useState(false);

    // Search for patients when phone number changes
    const searchPatients = useCallback(async (phoneNumber) => {
        if (phoneNumber.length < 3) {
            setPatientSuggestions([]);
            setOpenSuggestions(false);
            return;
        }
        
        try {
            setLoadingPatients(true);
            const patients = await searchPatientsByPhone(phoneNumber);
            
            // Add "Create New Patient" option if we have a valid phone number
            if (phoneNumber.length >= 3) {
                // Add the create new patient option
                const allOptions = [
                    ...patients,
                    // Add a special option for creating a new patient
                    {
                        id: 'create-new',
                        name: 'Create New Patient',
                        phone: phoneNumber
                    }
                ];
                
                setPatientSuggestions(allOptions);
                setOpenSuggestions(true); // Always show dropdown when we have the create option
            } else {
                setPatientSuggestions(patients);
                setOpenSuggestions(patients.length > 0);
            }
        } catch (error) {
            console.error("Failed to search patients:", error);
        } finally {
            setLoadingPatients(false);
        }
    }, []);

    // Handle phone number change with debounce
    const handlePhoneChange = (e) => {
        const phoneNumber = e.target.value;
        setForm(prev => ({ ...prev, phone: phoneNumber }));
        
        // Simple debounce for search
        const timer = setTimeout(() => {
            searchPatients(phoneNumber);
        }, 300);
        
        return () => clearTimeout(timer);
    };

    // Handle patient selection
    const handlePatientSelect = (event, patient) => {
        if (patient) {
            setSelectedPatient(patient);
            setForm(prev => ({
                ...prev,
                name: patient.name,
                patient_id: patient.id,
                phone: patient.phone || prev.phone
            }));
            // Close the dropdown after selection
            setOpenSuggestions(false);
            setPatientSuggestions([]);
        } else {
            setSelectedPatient(null);
            setForm(prev => ({
                ...prev,
                name: '',
                patient_id: null
            }));
        }
    };

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const validate = () => {
        const newErrors = {};
        if (!form.name.trim()) newErrors.name = 'Required';
        if (form.name.length > 100) newErrors.name = 'Max 100 characters';
        if (!form.phone) newErrors.phone = 'Required';
        if (form.phone && !/^[6-9]\d{9}$/.test(form.phone))
            newErrors.phone = 'Invalid Indian number';
        if (!form.datetime) newErrors.datetime = 'Required';
        return newErrors;
    };

    const handleSubmit = async (e) => {
        if (isSavingAppointment) return;
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;
        
        const currentUser = user?.displayName;
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const payload = {
            ...form,
            clinicLocation: 1,
            status: 'scheduled',
            updated_at: new Date().toISOString(),
            updated_by: currentUser,
            timeZone: userTimeZone
        };

        console.log('Submitting payload:', payload);

        try {
            setIsSavingAppointment(true);
            const success = await persistAppointment(payload);
            setSubmitMsg(success ? 'Appointment saved successfully.' : 'Failed to save appointment.');
            setNotification({
                open: true,
                message: success ? 'Appointment saved successfully.' : 'Failed to save appointment.',
                severity: success ? 'success' : 'error'
            });
            if (success) {
                setForm({
                    phone: '',
                    name: '',
                    patient_id: null,
                    datetime: '',
                    notes: ''
                });
                setSelectedPatient(null);
                setPatientSuggestions([]);
                setIsSavingAppointment(false);
            }
        } catch (error) {
            console.error("Failed to save appointment:", error);
            setNotification({
                open: true,
                message: 'Failed to save appointment.',
                severity: 'error'
            });
            setIsSavingAppointment(false);
        }
    };

    const handleCloseNotification = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setNotification({ ...notification, open: false });
    };

    // Handle creating a new patient
    const handleCreateNewPatient = () => {
        // Force close the dropdown immediately before showing the form
        setOpenSuggestions(false);
        setPatientSuggestions([]);
        
        // Small timeout to ensure dropdown is fully closed before showing modal
        setTimeout(() => {
            setShowPatientForm(true);
        }, 50);
    };

    // Handle when a patient is successfully added
    const handlePatientAdded = (newPatient) => {
        setShowPatientForm(false);
        setSelectedPatient(newPatient);
        setForm(prev => ({
            ...prev,
            name: newPatient.name,
            patient_id: newPatient.id,
            phone: newPatient.phone || prev.phone
        }));
        
        // Show success notification
        setNotification({
            open: true,
            message: 'Patient added successfully',
            severity: 'success'
        });
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ maxWidth: 400 }}>
                <Stack spacing={2}>
                    <Typography variant="h6">Book Appointment</Typography>

                    {/* Phone number field first for patient lookup */}
                    <TextField
                        label="Phone Number"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handlePhoneChange}
                        error={!!errors.phone}
                        helperText={errors.phone || "Enter phone number to find existing patients"}
                        fullWidth
                        required
                    />
                    
                    {/* Patient selector with autocomplete and create new option */}
                    <Autocomplete
                        options={patientSuggestions}
                        getOptionLabel={(option) => `${option.name} (${option.phone || 'No phone'})`}
                        loading={loadingPatients}
                        value={selectedPatient}
                        onChange={handlePatientSelect}
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
                            // Special case: Add New Patient option
                            if (option.id === 'create-new') {
                                return (
                                    <React.Fragment key="create-new">
                                        <Divider />
                                        <ListItem {...props} onClick={handleCreateNewPatient}>
                                            <ListItemText primary="➕ Create New Patient" secondary="Add a new patient record" />
                                        </ListItem>
                                    </React.Fragment>
                                );
                            }
                            
                            // Regular patient option
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

                    {/* Patient name field */}
                    <TextField
                        label="Patient Name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        error={!!errors.name}
                        helperText={errors.name || "Patient name will be filled automatically when selected above"}
                        required
                        fullWidth
                    />

                    {/* Date and time field */}
                    <TextField
                        label="Appointment Date & Time"
                        name="datetime"
                        type="datetime-local"
                        value={form.datetime}
                        onChange={handleChange}
                        error={!!errors.datetime}
                        helperText={errors.datetime}
                        required
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />

                    {/* Notes field */}
                    <TextField
                        label="Notes"
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        multiline
                        rows={3}
                        fullWidth
                    />

                    <Button type="submit" variant="contained" color="primary" disabled={isSavingAppointment}>
                        Submit
                    </Button>
                    {submitMsg && (
                        <Typography color={submitMsg.includes('success') ? 'green' : 'red'}>
                            {submitMsg}
                        </Typography>
                    )}

                    <Snackbar
                        open={notification.open}
                        autoHideDuration={5000}
                        onClose={handleCloseNotification}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                            {notification.message}
                        </Alert>
                    </Snackbar>

                    {/* Patient Creation Dialog */}
                    <PatientFormDialog 
                        open={showPatientForm}
                        onClose={() => setShowPatientForm(false)}
                        onPatientAdded={handlePatientAdded}
                        initialPhoneNumber={form.phone}
                    />
                </Stack>
            </Box>
        </LocalizationProvider>
    );
};

export default TabBook;