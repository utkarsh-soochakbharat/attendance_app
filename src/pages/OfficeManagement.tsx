import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import FaceAuthModal from '../components/FaceAuthModal';
import AdminVerificationModal from '../components/AdminVerificationModal';

const OfficeManagement = () => {
    const [offices, setOffices] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [editingOffice, setEditingOffice] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        latitude: '',
        longitude: '',
        radius: '300',
        start_time: '09:00',
        end_time: '18:00',
        voice_settings: {
            late: { message: "You are late!", audio: '' },
            on_time: { message: "On time!", audio: '' },
            check_out: { message: "Bye bye", audio: '' }
        }
    });

    useEffect(() => {
        loadOffices();
    }, []);

    const loadOffices = async () => {
        try {
            const data = await api.getOfficeLocations();
            setOffices(data);
        } catch (error) {
            console.error('Failed to load offices:', error);
        }
    };

    const handleAdminVerified = () => {
        setShowAddModal(true);
        setShowAdminModal(false);
    };

    const handleVoiceUpload = async (event: any, type: 'late' | 'on_time' | 'check_out') => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const res = await api.uploadVoice(file);
            if (res.success) {
                setFormData(prev => ({
                    ...prev,
                    voice_settings: {
                        ...prev.voice_settings,
                        [type]: {
                            ...prev.voice_settings[type],
                            audio: res.path
                        }
                    }
                }));
                alert(`${type} voice uploaded!`);
            } else {
                alert('Upload failed');
            }
        } catch (error) {
            console.error(error);
            alert('Upload error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const officeData = {
            name: formData.name,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            radius: parseInt(formData.radius),
            start_time: formData.start_time,
            end_time: formData.end_time,
            voice_settings: formData.voice_settings
        };

        if (editingOffice) {
            try {
                const res = await api.updateOfficeLocation({
                    id: editingOffice.id,
                    ...officeData
                });
                if (res.success) {
                    alert('Office location updated successfully!');
                } else {
                    alert('Failed to update: ' + res.error);
                }
            } catch (error: any) {
                alert('Failed to update: ' + (error.message || 'Unknown error'));
            }
        } else {
            try {
                const res = await api.addOfficeLocation(officeData);
                if (res.success) {
                    alert('Office location added successfully!');
                } else {
                    alert('Failed to add: ' + res.error);
                }
            } catch (error: any) {
                alert('Failed to add: ' + (error.message || 'Unknown error'));
            }
        }

        setShowAddModal(false);
        setEditingOffice(null);
        setFormData({
            name: '', latitude: '', longitude: '', radius: '300', start_time: '09:00', end_time: '18:00',
            voice_settings: {
                late: { message: "You are late!", audio: '' },
                on_time: { message: "On time!", audio: '' },
                check_out: { message: "Bye bye", audio: '' }
            }
        });
        loadOffices();
    };

    const handleEdit = (office: any) => {
        setEditingOffice(office);
        setFormData({
            name: office.name,
            latitude: office.latitude.toString(),
            longitude: office.longitude.toString(),
            radius: office.radius.toString(),
            start_time: office.start_time || '09:00',
            end_time: office.end_time || '18:00',
            voice_settings: office.voice_settings || {
                late: { message: "You are late!", audio: '' },
                on_time: { message: "On time!", audio: '' },
                check_out: { message: "Bye bye", audio: '' }
            }
        });
        setShowAdminModal(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this office location?')) {
            try {
                const res = await api.deleteOfficeLocation(id);
                if (res.success) {
                    alert('Office location deleted successfully!');
                    loadOffices();
                }
            } catch (error) {
                console.error(error);
                alert('Failed to delete office location');
            }
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.\\n\\n Tip: Use Google Maps to find coordinates manually.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6)
                }));
                alert('✅ Location captured successfully!');
            },
            (error) => {
                console.warn('Geolocation error:', error);

                let message = 'Could not get current location.\\n\\n';

                if (error.code === 1) {
                    message += ' Location access was denied.\\n\\n';
                } else if (error.message.includes('403') || error.message.includes('network service')) {
                    message += ' Network location service unavailable (Google API restriction).\\n\\n';
                } else {
                    message += ` Error: ${error.message}\\n\\n`;
                }

                message += ' Alternative: Use Google Maps (maps.google.com):\\n';
                message += '1. Search for your office location\\n';
                message += '2. Right-click on the map\\n';
                message += '3. Click the coordinates to copy them\\n';
                message += '4. Paste them into the Latitude/Longitude fields above';

                alert(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <AdminVerificationModal
                isOpen={showAdminModal}
                onClose={() => {
                    setShowAdminModal(false);
                    setEditingOffice(null);
                    setFormData({ 
                        name: '', 
                        latitude: '', 
                        longitude: '', 
                        radius: '300', 
                        start_time: '09:00', 
                        end_time: '18:00',
                        voice_settings: {
                            late: { message: "You are late!", audio: '' },
                            on_time: { message: "On time!", audio: '' },
                            check_out: { message: "Bye bye", audio: '' }
                        }
                    });
                }}
                onVerified={handleAdminVerified}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Office Locations</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Manage multiple office branches and their geofencing settings
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAdminModal(true)}
                    style={{ padding: '12px 24px' }}
                >
                    + Add Office Location
                </button>
            </div>

            {/* Office Locations Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {offices.map(office => (
                    <div key={office.id} className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{office.name}</h3>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Created: {new Date(office.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn"
                                    onClick={() => handleEdit(office)}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '0.85rem',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        color: '#3b82f6'
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    className="btn"
                                    onClick={() => handleDelete(office.id)}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '0.85rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    Coordinates
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                    {office.latitude.toFixed(6)}, {office.longitude.toFixed(6)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    Geofence Radius
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--primary)' }}>
                                    {office.radius} meters
                                </div>
                            </div>
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    Office Hours
                                </div>
                                <div style={{ fontSize: '0.95rem', fontWeight: '500', color: '#3b82f6' }}>
                                    {office.start_time || '09:00'} - {office.end_time || '18:00'}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {offices.length === 0 && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
                    <h3>No Office Locations Yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Add your first office location to enable multi-branch support
                    </p>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    padding: '20px',
                    overflowY: 'auto',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div className="card" style={{ 
                        maxWidth: '500px', 
                        width: '100%', 
                        padding: '1.5rem',
                        marginTop: '20px',
                        marginBottom: '20px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>
                            {editingOffice ? 'Edit Office Location' : '➕ Add Office Location'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Office Name</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Head Office, Branch 1, Mumbai Office"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Latitude</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        step="any"
                                        required
                                        value={formData.latitude}
                                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                        placeholder="28.62884"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Longitude</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        step="any"
                                        required
                                        value={formData.longitude}
                                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                        placeholder="77.37633"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                className="btn"
                                onClick={getCurrentLocation}
                                style={{
                                    width: '100%',
                                    marginBottom: '0.5rem',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    color: '#22c55e'
                                }}
                            >
                                Use Current Location
                            </button>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                marginBottom: '1rem',
                                textAlign: 'center'
                            }}>
                                Or use <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Google Maps</a> to find coordinates
                            </div>

                            <div className="form-group">
                                <label className="form-label">Geofence Radius (meters)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min="1"
                                    required
                                    value={formData.radius}
                                    onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                                />
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Employees must be within this radius to mark attendance
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1rem'
                            }}>
                                <div style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    marginBottom: '1rem',
                                    color: '#3b82f6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    Office Hours (Time-Bound Geofencing)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Start Time</label>
                                        <input
                                            className="form-input"
                                            type="time"
                                            required
                                            value={formData.start_time}
                                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">End Time</label>
                                        <input
                                            className="form-input"
                                            type="time"
                                            required
                                            value={formData.end_time}
                                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(59, 130, 246, 0.8)', marginTop: '0.75rem' }}>
                                    Attendance can only be marked during these hours to prevent fake check-ins
                                </div>
                            </div>

                            {/* Voice & Alerts Section */}
                            <div style={{
                                background: 'rgba(168, 85, 247, 0.1)',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1rem'
                            }}>
                                <div style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    marginBottom: '1rem',
                                    color: '#a855f7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    Voice & Alerts (Fun Mode)
                                </div>

                                {/* Late Arrival */}
                                <div className="form-group">
                                    <label className="form-label" style={{ color: '#a855f7' }}>Late Arrival</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="Message (e.g. You are late!)"
                                        value={formData.voice_settings?.late?.message || ''}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            voice_settings: { ...prev.voice_settings, late: { ...prev.voice_settings.late, message: e.target.value } }
                                        }))}
                                        style={{ marginBottom: '0.5rem' }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={(e) => handleVoiceUpload(e, 'late')}
                                            style={{ fontSize: '0.8rem' }}
                                        />
                                        {formData.voice_settings?.late?.audio && <span style={{ fontSize: '0.8rem', color: '#22c55e' }}>Audio Set ✓</span>}
                                    </div>
                                </div>

                                {/* On Time */}
                                <div className="form-group">
                                    <label className="form-label" style={{ color: '#a855f7' }}>On Time</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="Message (e.g. On Time!)"
                                        value={formData.voice_settings?.on_time?.message || ''}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            voice_settings: { ...prev.voice_settings, on_time: { ...prev.voice_settings.on_time, message: e.target.value } }
                                        }))}
                                        style={{ marginBottom: '0.5rem' }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={(e) => handleVoiceUpload(e, 'on_time')}
                                            style={{ fontSize: '0.8rem' }}
                                        />
                                        {formData.voice_settings?.on_time?.audio && <span style={{ fontSize: '0.8rem', color: '#22c55e' }}>Audio Set ✓</span>}
                                    </div>
                                </div>

                                {/* Check Out */}
                                <div className="form-group">
                                    <label className="form-label" style={{ color: '#a855f7' }}>Check Out</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="Message (e.g. Bye bye)"
                                        value={formData.voice_settings?.check_out?.message || ''}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            voice_settings: { ...prev.voice_settings, check_out: { ...prev.voice_settings.check_out, message: e.target.value } }
                                        }))}
                                        style={{ marginBottom: '0.5rem' }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={(e) => handleVoiceUpload(e, 'check_out')}
                                            style={{ fontSize: '0.8rem' }}
                                        />
                                        {formData.voice_settings?.check_out?.audio && <span style={{ fontSize: '0.8rem', color: '#22c55e' }}>Audio Set ✓</span>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingOffice(null);
                                        setFormData({
                                            name: '', latitude: '', longitude: '', radius: '300', start_time: '09:00', end_time: '18:00',
                                            voice_settings: {
                                                late: { message: "You are late!", audio: '' },
                                                on_time: { message: "On time!", audio: '' },
                                                check_out: { message: "Bye bye", audio: '' }
                                            }
                                        });
                                    }}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                >
                                    {editingOffice ? 'Update' : 'Add'} Office
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficeManagement;
