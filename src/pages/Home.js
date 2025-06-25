import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { BottomNavigation, BottomNavigationAction, Paper, Grid, CircularProgress, Typography, Box } from '@mui/material';
import ManageIcon from '@mui/icons-material/Book';
import ReportIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import { AnimatePresence, motion } from 'framer-motion';
import './Home.css';
import TabManage from './TabManage';
import TabReport from './TabReport';
import TabManageUsers from './TabManageUsers';
import TabManagePatients from './TabManagePatients';
import { fetchAppointmentsByDateAndByLocation } from '../api/userApi';


function Home() {
  const { user, signOut } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Appointment status state
  const [apptStats, setApptStats] = useState({ loading: true, today: 0, completed: 0, upcoming: 0 });

  // Expose a refresh function globally for dashboard cards
  const refreshDashboardCards = useCallback(() => {
    setApptStats(s => ({ ...s, loading: true }));
    fetchAppointmentsByDateAndByLocation(new Date(), 1)
      .then(appts => {
        let today = appts.length;
        let completed = appts.filter(a => a.status === 'completed').length;
        let upcoming = appts.filter(a => a.status === 'scheduled').length;
        setApptStats({ loading: false, today, completed, upcoming });
      })
      .catch(() => {
        setApptStats({ loading: false, today: 0, completed: 0, upcoming: 0 });
      });
  }, []);

  useEffect(() => {
    window.refreshDashboardCards = refreshDashboardCards;
    refreshDashboardCards();
    return () => { delete window.refreshDashboardCards; };
  }, [refreshDashboardCards]);

  const tabs = [
    <TabManage />,
    <TabManagePatients />,
    <TabReport />,
    user.isAdmin ? <TabManageUsers /> : null
  ].filter(Boolean);

  const handleTabChange = (event, newValue) => {
    setDirection(newValue > tabIndex ? 1 : -1);
    setTabIndex(newValue);
  };

  return (
    <div className="home-container">
      <header className="app-header">
        <h1>Kinetix</h1>
        <div className="user-profile">
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="user-avatar"
            />
          )}
          <span className="user-name">{user?.displayName}</span>
          <button onClick={signOut} className="sign-out-button">
            Sign Out
          </button>
        </div>
      </header>

      <main className="app-content" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', minHeight: '80vh', margin: '0 auto' }}>
        {/* Stacked Status Cards - Left */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 180, maxWidth: 220, flexShrink: 0, paddingRight: 2, ml: -10 }}>
          <Box sx={{
            background: 'linear-gradient(135deg, #e3f2fd 60%, #bbdefb 100%)',
            color: '#1976d2',
            borderRadius: 2,
            p: 2.5,
            minHeight: 90,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 2
          }}>
            <Typography variant="h6" align="center" sx={{ mb: 1, fontWeight: 500 }}>Today's</Typography>
            {apptStats.loading ? (
              <CircularProgress size={28} sx={{ color: '#1976d2' }} />
            ) : (
              <Typography variant="h3" align="center" sx={{ fontWeight: 700 }}>{apptStats.today}</Typography>
            )}
          </Box>
          <Box sx={{
            background: 'linear-gradient(135deg, #e8f5e9 60%, #c8e6c9 100%)',
            color: '#2e7d32',
            borderRadius: 2,
            p: 2.5,
            minHeight: 90,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 2
          }}>
            <Typography variant="h6" align="center" sx={{ mb: 1, fontWeight: 500 }}>Completed</Typography>
            {apptStats.loading ? (
              <CircularProgress size={28} sx={{ color: '#2e7d32' }} />
            ) : (
              <Typography variant="h3" align="center" sx={{ fontWeight: 700 }}>{apptStats.completed}</Typography>
            )}
          </Box>
          <Box sx={{
            background: 'linear-gradient(135deg, #fffde7 60%, #fff9c4 100%)',
            color: '#f9a825',
            borderRadius: 2,
            p: 2.5,
            minHeight: 90,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 2
          }}>
            <Typography variant="h6" align="center" sx={{ mb: 1, fontWeight: 500 }}>Upcoming</Typography>
            {apptStats.loading ? (
              <CircularProgress size={28} sx={{ color: '#f9a825' }} />
            ) : (
              <Typography variant="h3" align="center" sx={{ fontWeight: 700 }}>{apptStats.upcoming}</Typography>
            )}
          </Box>
        </Box>
        {/* Main Content - Right */}
        <div className="app-main-content" style={{ flex: 1, paddingLeft: 32, paddingBottom: '80px' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tabIndex}
              initial={{ x: direction * 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -100, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {tabs[tabIndex]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation value={tabIndex} onChange={handleTabChange} showLabels>
          <BottomNavigationAction label="Appointments" icon={<ManageIcon />} />
          <BottomNavigationAction label="Patients" icon={<PersonIcon />} />
          <BottomNavigationAction label="Report" icon={<ReportIcon />} />          
          {user.isAdmin && <BottomNavigationAction label="Users" icon={<PeopleIcon />} />}
        </BottomNavigation>
      </Paper>
    </div>
  );
}

export default Home;
