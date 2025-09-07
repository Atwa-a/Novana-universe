import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import DashboardPage from './components/DashboardPage';
import ProfilePage from './components/ProfilePage';
import GalaxyBackground from './components/GalaxyBackground';
import ContactPage from './components/ContactPage';

const App: React.FC = () => {
  
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleLogout = () => {
    setToken(null);
  };

  return (
    <>
     
      <GalaxyBackground />
      <Router>
        <Routes>
          <Route
            path="/login"
            element={token ? <Navigate to="/dashboard" /> : <LoginPage onLogin={setToken} />}
          />
          <Route
            path="/signup"
            element={token ? <Navigate to="/dashboard" /> : <SignupPage onSignup={setToken} />}
          />
          <Route
            path="/dashboard"
            element={token ? <DashboardPage token={token} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={token ? <ProfilePage token={token} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/contact"
            element={<ContactPage />}
          />
          
          <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
