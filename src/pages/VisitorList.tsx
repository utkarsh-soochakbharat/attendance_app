import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import FaceAuthModal from '../components/FaceAuthModal';

const VisitorList = () => {
    const navigate = useNavigate();
    const [visitors, setVisitors] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(true);
    const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);

    const fetchVisitors = async () => {
        const data = await api.getVisitors();
        setVisitors(data);
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchVisitors();
            const interval = setInterval(fetchVisitors, 5000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    const handleCheckout = async (id: number) => {
        await api.checkoutVisitor(id);
        fetchVisitors();
    };

    const filteredVisitors = visitors.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.phone.includes(search) ||
        v.host_employee.toLowerCase().includes(search.toLowerCase())
    );

    const formatVisitorDateTime = (value: string | null) => {
        if (!value) return '-';
        try {
            const iso = value.endsWith('Z') ? value : `${value}Z`;
            const date = new Date(iso);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return '-';
        }
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
                title="Visitor Log - Authentication Required"
            />

            {!isAuthenticated ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Please authenticate to access visitor logs</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1>Visitor Log</h1>
                            {authenticatedUser && (
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '5px 0 0 0' }}>
                                    Authenticated as: {authenticatedUser.name}
                                </p>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Search visitors..."
                            className="form-input"
                            style={{ width: '250px' }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="card" style={{ marginTop: '1.5rem', padding: 0, overflow: 'hidden' }}>
                        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Host</th>
                                        <th>Check In</th>
                                        <th>Check Out</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVisitors.map(v => (
                                        <tr key={v.id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{v.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.phone}</div>
                                            </td>
                                            <td>{v.host_employee}</td>
                                            <td>{formatVisitorDateTime(v.check_in_time)}</td>
                                            <td>{formatVisitorDateTime(v.check_out_time)}</td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: v.status === 'checked_in' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                                    color: v.status === 'checked_in' ? '#10b981' : '#94a3b8',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {v.status === 'checked_in' ? 'Inside' : 'Left'}
                                                </span>
                                            </td>
                                            <td>
                                                {v.status === 'checked_in' && (
                                                    <button className="btn" style={{ padding: '4px 8px', fontSize: '0.85rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)' }} onClick={() => handleCheckout(v.id)}>
                                                        Checkout
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredVisitors.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                                No visitors found.
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

export default VisitorList;
