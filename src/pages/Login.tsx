import React from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock login
        navigate('/dashboard');
    }

    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-mesh)', backgroundSize: 'cover' }}>
            <div className="card" style={{ width: '420px', padding: '40px', backdropFilter: 'blur(30px)' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <img src="./src/assets/logo.png" alt="Soochak Bharat" style={{ maxWidth: '240px', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Sign in to manage visitors</p>
                </div>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-input" type="text" placeholder="admin" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" placeholder="••••••" required />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Sign In</button>
                    <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Protected by SecureGuard Systems
                    </div>
                </form>
            </div>
        </div>
    );
};
export default Login;
