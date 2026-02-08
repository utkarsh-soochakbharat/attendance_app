import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FaceAuthModal from '../components/FaceAuthModal';
import api from '../utils/api';
import { generateAttendanceCSV, downloadCSV } from '../utils/csvGenerator';

interface Employee {
    id: number;
    employee_id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
}

interface AttendanceRecord {
    id: number;
    employee_id: number;
    type: 'check-in' | 'check-out';
    timestamp: string;
    name: string;
    employee_code: string;
}

const AttendanceReports = () => {
    const navigate = useNavigate();
    const [showAuthModal, setShowAuthModal] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authenticatedUser, setAuthenticatedUser] = useState<Employee | null>(null);

    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchEmployees();
            fetchAttendance();
        }
    }, [isAuthenticated, selectedMonth, selectedYear]);

    const fetchEmployees = async () => {
        try {
            const response = await api.getEmployees();
            setEmployees(response);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const response = await api.getAttendance();

            // Filter by selected month/year
            const filtered = response.filter((record: AttendanceRecord) => {
                const date = new Date(record.timestamp);
                return date.getMonth() + 1 === selectedMonth &&
                    date.getFullYear() === selectedYear;
            });

            setAttendanceData(filtered);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCSV = () => {
        if (attendanceData.length === 0) {
            alert('No attendance data to download');
            return;
        }

        const csvContent = generateAttendanceCSV(attendanceData);
        const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long' });
        const filename = `Attendance_Report_${monthName}_${selectedYear}.csv`;

        downloadCSV(csvContent, filename);
    };

    const handleSendEmails = async () => {
        if (!window.confirm('Send monthly attendance emails to all employees?')) {
            return;
        }

        setSendingEmail(true);
        try {
            const baseUrl = api.getCurrentBaseUrl();
            const response = await fetch(`${baseUrl}/send-monthly-attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sendToAll: true,
                    month: String(selectedMonth).padStart(2, '0'),
                    year: String(selectedYear)
                })
            });

            const data = await response.json();

            if (data.success) {
                alert(`✅ Emails sent successfully!\n${data.message}`);
            } else {
                alert(`❌ Error: ${data.error || 'Failed to send emails'}`);
            }
        } catch (error: any) {
            alert(`❌ Error: ${error.message}`);
        } finally {
            setSendingEmail(false);
        }
    };

    // Calculate statistics
    const stats = {
        totalEmployees: new Set(attendanceData.map(r => r.employee_id)).size,
        totalRecords: attendanceData.length,
        presentDays: attendanceData.filter(r => r.type === 'check-in').length,
        absentDays: employees.length * new Date(selectedYear, selectedMonth, 0).getDate() -
            attendanceData.filter(r => r.type === 'check-in').length
    };

    return (
        <div>
            <FaceAuthModal
                isOpen={showAuthModal}
                onClose={() => {
                    setShowAuthModal(false);
                    navigate('/');
                }}
                onAuthenticated={(employee) => {
                    setAuthenticatedUser(employee);
                    setIsAuthenticated(true);
                    setShowAuthModal(false);
                }}
                requiredRoles={['HR', 'Founder', 'Manager']}
                title="Attendance Reports - Authentication Required"
            />

            {!isAuthenticated ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Please authenticate to access attendance reports</p>
                </div>
            ) : (
                <>
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h1>Attendance Reports</h1>
                                {authenticatedUser && (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '5px 0 0 0' }}>
                                        Authenticated as: {authenticatedUser.name} ({authenticatedUser.designation})
                                    </p>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={handleDownloadCSV}
                                    disabled={loading || attendanceData.length === 0}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: attendanceData.length === 0 ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        opacity: attendanceData.length === 0 ? 0.5 : 1
                                    }}
                                >
                                    Download CSV Report
                                </button>
                                <button
                                    onClick={handleSendEmails}
                                    disabled={sendingEmail || attendanceData.length === 0}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: sendingEmail || attendanceData.length === 0 ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        opacity: sendingEmail || attendanceData.length === 0 ? 0.5 : 1
                                    }}
                                >
                                    {sendingEmail ? 'Sending...' : 'Send Monthly Emails'}
                                </button>
                            </div>
                        </div>

                        {/* Month/Year Selector */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--text-color)' }}>Month</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderRadius: '8px',
                                        border: '2px solid #667eea',
                                        background: '#1a1a2e',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        minWidth: '150px'
                                    }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1} style={{ background: '#1a1a2e', color: '#ffffff' }}>
                                            {new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--text-color)' }}>Year</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderRadius: '8px',
                                        border: '2px solid #667eea',
                                        background: '#1a1a2e',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        minWidth: '120px'
                                    }}
                                >
                                    {Array.from({ length: 5 }, (_, i) => {
                                        const year = new Date().getFullYear() - i;
                                        return <option key={year} value={year} style={{ background: '#1a1a2e', color: '#ffffff' }}>{year}</option>;
                                    })}
                                </select>
                            </div>
                        </div>

                        {/* Statistics Cards */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}>
                            <div style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                color: 'white'
                            }}>
                                <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Employees</div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                    {stats.totalEmployees}
                                </div>
                            </div>
                            <div style={{
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                color: 'white'
                            }}>
                                <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Records</div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                    {stats.totalRecords}
                                </div>
                            </div>
                            <div style={{
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                color: 'white'
                            }}>
                                <div style={{ fontSize: '14px', opacity: 0.9 }}>Present Days</div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                    {stats.presentDays}
                                </div>
                            </div>
                        </div>

                        {/* Preview Table */}
                        <div style={{
                            background: 'var(--card-bg)',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                            <h2 style={{ marginBottom: '1rem' }}>Attendance Preview</h2>
                            {loading ? (
                                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    Loading attendance data...
                                </p>
                            ) : attendanceData.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    No attendance records for selected period
                                </p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--primary-color)', color: 'white' }}>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>Employee</th>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>In Time</th>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>Out Time</th>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                // Group records by employee and date
                                                const grouped: any = {};
                                                attendanceData.forEach((record) => {
                                                    const date = new Date(record.timestamp).toLocaleDateString('en-GB');
                                                    const key = `${record.employee_id}_${date}`;

                                                    if (!grouped[key]) {
                                                        grouped[key] = {
                                                            name: record.name,
                                                            date: date,
                                                            checkIn: null,
                                                            checkOut: null
                                                        };
                                                    }

                                                    if (record.type === 'check-in') {
                                                        grouped[key].checkIn = record.timestamp;
                                                    } else if (record.type === 'check-out') {
                                                        grouped[key].checkOut = record.timestamp;
                                                    }
                                                });

                                                return Object.values(grouped).slice(0, 20).map((row: any, index) => (
                                                    <tr key={index} style={{
                                                        borderBottom: '1px solid var(--border-color)',
                                                        background: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)'
                                                    }}>
                                                        <td style={{ padding: '12px' }}>{row.name}</td>
                                                        <td style={{ padding: '12px' }}>{row.date}</td>
                                                        <td style={{ padding: '12px' }}>
                                                            {row.checkIn
                                                                ? new Date(row.checkIn).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                })
                                                                : '--'
                                                            }
                                                        </td>
                                                        <td style={{ padding: '12px' }}>
                                                            {row.checkOut
                                                                ? new Date(row.checkOut).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                })
                                                                : '--'
                                                            }
                                                        </td>
                                                        <td style={{ padding: '12px' }}>
                                                            <span style={{
                                                                padding: '4px 12px',
                                                                borderRadius: '12px',
                                                                background: row.checkOut ? '#f59e0b' : '#10b981',
                                                                color: 'white',
                                                                fontSize: '12px',
                                                                fontWeight: '600'
                                                            }}>
                                                                {row.checkOut ? 'Check-out' : 'Present'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
                                    {attendanceData.length > 20 && (
                                        <p style={{
                                            textAlign: 'center',
                                            padding: '1rem',
                                            color: 'var(--text-muted)',
                                            fontSize: '14px'
                                        }}>
                                            Showing first 20 of {attendanceData.length} records. Download CSV for full report.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AttendanceReports;
