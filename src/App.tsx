// React import not needed in React 18+
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
// Placeholder imports
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import CheckIn from './pages/CheckIn';
import VisitorList from './pages/VisitorList';
import Appointments from './pages/Appointments';
import EmployeeRegistration from './pages/EmployeeRegistration';
import EmployeeAttendance from './pages/EmployeeAttendance';
import GeofencingSetup from './pages/GeofencingSetup';
import OfficeManagement from './pages/OfficeManagement';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/check-in" element={<CheckIn />} />
          <Route path="/visitors" element={<VisitorList />} />
          <Route path="/employee-registration" element={<EmployeeRegistration />} />
          <Route path="/employee-attendance" element={<EmployeeAttendance />} />
          <Route path="/geofencing-setup" element={<GeofencingSetup />} />
          <Route path="/office-management" element={<OfficeManagement />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
