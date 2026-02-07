import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import FaceAuthModal from '../components/FaceAuthModal';

const Appointments = () => {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ visitor_name: '', visitor_phone: '', host_employee: '', visit_time: '', purpose: '' });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(true);
    const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);

    const fetchAppointments = async () => {
        try {
            const data = await api.getAppointments();
            setAppointments(data);
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        if (isAuthenticated) {
            fetchAppointments();
        }
    }, [isAuthenticated]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.addAppointment(form);
            if (res.success) {
                setShowForm(false);
                setForm({ visitor_name: '', visitor_phone: '', host_employee: '', visit_time: '', purpose: '' });
                fetchAppointments();
            } else {
                alert('Error: ' + res.error);
            }
        } catch (e) {
            console.error(e);
        }
    }

    const updateStatus = async (id: number, status: string) => {
        await api.updateAppointmentStatus({ id, status });
        fetchAppointments();
    }

    const handleCheckIn = (appointment: any) => {
        navigate('/check-in', {
            state: {
                name: appointment.visitor_name,
                phone: appointment.visitor_phone,
                host_employee: appointment.host_employee,
                purpose: appointment.purpose,
                company: 'Pre-registered'
            }
        });
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
                title="Appointments - Authentication Required"
            />

            {!isAuthenticated ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Please authenticate to access appointments</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h1>Appointments</h1>
                            {authenticatedUser && (
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '5px 0 0 0' }}>
                                    Authenticated as: {authenticatedUser.name} ({authenticatedUser.designation})
                                </p>
                            )}
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                            {showForm ? 'Cancel' : '+ New Appointment'}
                        </button>
                    </div>

                    {showForm && (
                        <div className="card" style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Schedule New Visit</h3>
                            <form onSubmit={handleSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Visitor Name</label>
                                        <input className="form-input" name="visitor_name" required value={form.visitor_name} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input className="form-input" name="visitor_phone" required value={form.visitor_phone} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Host Employee</label>
                                        <input className="form-input" name="host_employee" required value={form.host_employee} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Date & Time</label>
                                        <input className="form-input" name="visit_time" type="datetime-local" required value={form.visit_time} onChange={handleChange} />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">Purpose</label>
                                        <input className="form-input" name="purpose" value={form.purpose} onChange={handleChange} />
                                    </div>
                                </div>
                                <button className="btn btn-primary" type="submit" style={{ marginTop: '1rem' }}>Create Appointment</button>
                            </form>
                        </div>
                    )}

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date/Time</th>
                                        <th>Visitor</th>
                                        <th>Host</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map(a => (
                                        <tr key={a.id}>
                                            <td>{new Date(a.visit_time).toLocaleString()}</td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{a.visitor_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.visitor_phone}</div>
                                            </td>
                                            <td>{a.host_employee}</td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: a.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' :
                                                        a.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                                    color: a.status === 'approved' ? '#10b981' :
                                                        a.status === 'pending' ? '#f59e0b' : '#94a3b8',
                                                    fontSize: '0.85rem',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {a.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {a.status === 'pending' ? (
                                                        <>
                                                            <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#10b981', color: 'white' }} onClick={() => updateStatus(a.id, 'approved')}>
                                                                Approve
                                                            </button>
                                                            <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#ef4444', color: 'white' }} onClick={() => updateStatus(a.id, 'rejected')}>
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : a.status === 'approved' ? (
                                                        <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)' }} onClick={() => handleCheckIn(a)}>
                                                            Check In
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {appointments.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                                No appointments scheduled.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Appointments;
