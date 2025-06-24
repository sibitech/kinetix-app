import React, { useState } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Button, Grid, FormControl,
  InputLabel, Select, MenuItem, CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addPatient } from '../api/userApi';

const PatientFormDialog = ({ open, onClose, onPatientAdded, initialPhoneNumber = '' }) => {
  const [currentPatient, setCurrentPatient] = useState({
    name: '',
    phone: initialPhoneNumber,
    sex: '',
    dob: null,
    email: '',
    address: '',
    medical_history: ''
  });
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      const result = await addPatient(currentPatient);
      
      if (result.success) {
        // Reset form
        setCurrentPatient({
          name: '',
          phone: '',
          sex: '',
          dob: null,
          email: '',
          address: '',
          medical_history: ''
        });
        
        // Notify parent component
        onPatientAdded(result.patient);
      } else {
        // If there's an error handling in the parent, you could pass the error
        console.error('Failed to add patient:', result.error);
        onClose();
      }
    } catch (error) {
      console.error('Error adding patient:', error);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setCurrentPatient({
      name: '',
      phone: initialPhoneNumber,
      sex: '',
      dob: null,
      email: '',
      address: '',
      medical_history: ''
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>Add New Patient</DialogTitle>
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
        <Button onClick={handleCancel}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary" 
          disabled={isSaving}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PatientFormDialog;