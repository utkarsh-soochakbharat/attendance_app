import { useEffect, useState } from 'react';
import api from '../utils/api';

const VisitorList = () => {
    const [visitors, setVisitors] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    const fetchVisitors = async () => {
        const data = await api.getVisitors();
        setVisitors(data);
    };

    useEffect(() => {
        fetchVisitors();
        const interval = setInterval(fetchVisitors, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCheckout = async (id: number) => {
        await api.checkoutVisitor(id);
        fetchVisitors();
    };

    const filteredVisitors = visitors.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.phone.includes(search) ||
        v.host_employee.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Visitor Log</h1>
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
                                    <td>{new Date(v.check_in_time).toLocaleString('en-US', {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                                    })}</td>
                                    <td>{v.check_out_time ? new Date(v.check_out_time).toLocaleString('en-US', {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                                    }) : '-'}</td>
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
        </div>
    );
};
export default VisitorList;
