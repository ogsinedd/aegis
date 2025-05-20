import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

// Ленивая загрузка страниц
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Containers = React.lazy(() => import('./pages/Containers'));
const ContainerDetails = React.lazy(() => import('./pages/ContainerDetails'));
const Vulnerabilities = React.lazy(() => import('./pages/Vulnerabilities'));
const VulnerabilityDetails = React.lazy(() => import('./pages/VulnerabilityDetails'));
const PatchPlan = React.lazy(() => import('./pages/PatchPlan'));
const Hooks = React.lazy(() => import('./pages/Hooks'));

function App() {
  return (
    <div className="dark">
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="loading">
            <div className="loading-spinner" />
          </div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="containers" element={<Containers />} />
            <Route path="containers/:id" element={<ContainerDetails />} />
            <Route path="vulnerabilities" element={<Vulnerabilities />} />
            <Route path="vulnerabilities/:id" element={<VulnerabilityDetails />} />
            <Route path="plan" element={<PatchPlan />} />
            <Route path="hooks" element={<Hooks />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </React.Suspense>
    </div>
  );
}

export default App; 
