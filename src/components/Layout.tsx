import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import AdminVerificationModal from './AdminVerificationModal';
import '../styles/layout.css';

const Layout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Commented out unused function
    // const changeServerUrl = async () => {
    //     const current = api.getCurrentBaseUrl();
    //     const newUrl = prompt(`Current URL: ${current}\n\nEnter Server URL (e.g. http://10.0.2.2:3000/api for Emulator):`, current);
    //     if (newUrl && newUrl !== current) {
    //         api.setBaseUrl(newUrl);
    //         window.location.reload();
    //     }
    // };

    const handleAdminVerified = () => {
        // Double check authorization logic if needed, but modal handles it.
        setShowAdminModal(false);
        setIsMobileMenuOpen(false);
        navigate('/geofencing-setup');
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const handleNavClick = () => {
        // Close mobile menu when navigating
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="app-container">
            <AdminVerificationModal
                isOpen={showAdminModal}
                onClose={() => setShowAdminModal(false)}
                onVerified={handleAdminVerified}
            />

            {/* Mobile Menu Toggle */}
            <button
                className="mobile-menu-toggle"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            {/* Mobile Overlay */}
            <div
                className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
                onClick={closeMobileMenu}
            ></div>

            <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="logo-container">
                    <img src={logo} alt="Soochak Bharat" className="logo-img" />
                </div>
                <nav className="nav-menu">
                    <Link
                        to="/dashboard"
                        className={`nav-item ${location.pathname.includes('dashboard') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        Dashboard
                    </Link>
                    <Link
                        to="/appointments"
                        className={`nav-item ${location.pathname.includes('appointments') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        Appointments
                    </Link>
                    <Link
                        to="/check-in"
                        className={`nav-item ${location.pathname.includes('check-in') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        Visitor Check In
                    </Link>
                    <Link
                        to="/visitors"
                        className={`nav-item ${location.pathname.includes('visitors') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        Visitor Log
                    </Link>
                    <div style={{ borderTop: '1px solid var(--border-glass)', margin: '10px 0', opacity: 0.3 }}></div>
                    <Link
                        to="/employee-registration"
                        className={`nav-item ${location.pathname.includes('employee-registration') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        Register Employee
                    </Link>
                    <Link
                        to="/employee-attendance"
                        className={`nav-item ${location.pathname.includes('employee-attendance') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        Employee Attendance
                    </Link>
                    <Link
                        to="/attendance-reports"
                        className={`nav-item ${location.pathname.includes('attendance-reports') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        Attendance Reports
                    </Link>
                    <div style={{ borderTop: '1px solid var(--border-glass)', margin: '10px 0', opacity: 0.3 }}></div>
                    <Link
                        to="/office-management"
                        className={`nav-item ${location.pathname.includes('office-management') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        Office Locations
                    </Link>
                    <div
                        onClick={() => {
                            setShowAdminModal(true);
                            setIsMobileMenuOpen(false);
                        }}
                        className={`nav-item ${location.pathname.includes('geofencing-setup') ? 'active' : ''}`}
                        style={{ cursor: 'pointer' }}
                    >
                        Set Geofencing
                    </div>

                </nav>
                <div className="user-profile">
                    <span>Admin</span>
                </div>
            </aside>
            <main className="content-area">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
