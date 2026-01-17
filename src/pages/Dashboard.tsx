import { useEffect, useState } from 'react';
import api from '../utils/api';

interface Stats {
    todayVisitors: number;
    activeVisitors: number;
}

const Dashboard = () => {
    const [stats, setStats] = useState<Stats>({ todayVisitors: 0, activeVisitors: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.getDashboardStats();
                setStats(data);
            } catch (e) {
                console.error(e);
            }
        };
        fetchStats();
    }, []);

    return (
        <div>
            <h1>Dashboard</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div className="card">
                    <h3>Today's Visitors</h3>
                    <p className="stat-value">{stats.todayVisitors}</p>
                </div>
                <div className="card">
                    <h3>Currently Inside</h3>
                    <p className="stat-value">{stats.activeVisitors}</p>
                </div>
            </div>
        </div>
    );
};
export default Dashboard;
