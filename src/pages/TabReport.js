import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography, Box, Card, CardContent,
  Grid, CircularProgress, Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { fetchAppointmentsByDateAndByLocation } from '../api/userApi';

const TabReports = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    totalEarnings: 0
  });

  // Memoized function to fetch appointments and calculate report data (always use clinic_id 1)
  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const appointments = await fetchAppointmentsByDateAndByLocation(selectedDate, 1);
      // Calculate statistics
      const stats = {
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        totalEarnings: 0
      };
      appointments.forEach(appointment => {
        if (appointment.status === 'scheduled') {
          stats.scheduled++;
        } else if (appointment.status === 'completed') {
          stats.completed++;
          stats.totalEarnings += parseFloat(appointment.amount || 0);
        } else if (appointment.status === 'cancelled') {
          stats.cancelled++;
        }
      });
      setReportData(stats);
    } catch (error) {
      console.error('Failed to load report data', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(value);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h5" gutterBottom>
          Appointment Reports
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <DatePicker
            label="Report Date"
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
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Appointment Status
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {reportData.scheduled}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Scheduled
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {reportData.completed}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Completed
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="error.main">
                          {reportData.cancelled}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Cancelled
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue Summary
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ textAlign: 'center', pt: 2 }}>
                    <Typography variant="h3" color="success.main">
                      {formatCurrency(reportData.totalEarnings)}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                      Total Revenue (Completed Appointments)
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Summary
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body1">
                    {`Date: ${selectedDate.toLocaleDateString()}`}
                  </Typography>
                  <Typography variant="body1">
                    {`Total Appointments: ${reportData.scheduled + reportData.completed + reportData.cancelled}`}
                  </Typography>
                  <Typography variant="body1">
                    {`Completion Rate: ${reportData.completed > 0 ? 
                      Math.round((reportData.completed / (reportData.scheduled + reportData.completed + reportData.cancelled)) * 100) : 0}%`}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default TabReports;