import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Radars from './pages/Radars';
import Fines from './pages/Fines';
import Reports from './pages/Reports';
import PlateRecognition from './pages/PlateRecognition';
import FinesImagesMonitor from './pages/FinesImagesMonitor';
import AICases from './pages/AICases';
import Settings from './pages/Settings';
import AuthTest from './pages/AuthTest';

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/radars"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Radars />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fines"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Fines />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/plate-recognition"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PlateRecognition />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fines-images-monitor"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FinesImagesMonitor />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/speed-analysis"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-cases"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AICases />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
