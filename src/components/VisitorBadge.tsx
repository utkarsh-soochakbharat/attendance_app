import React, { useState, useEffect } from 'react';
import '../styles/badge.css';
import logo from '../assets/logo.png';
import siteQr from '../assets/site_qr.png';

interface Visitor {
    name: string;
    company: string;
    host_employee: string;
    check_in_time: string;
    id: number;
    photo?: string;
    purpose?: string;
}

interface Props {
    visitor: Visitor;
    customLogo?: string;
}

const VisitorBadge: React.FC<Props> = ({ visitor, customLogo }) => {
    const [logoBase64, setLogoBase64] = useState<string>('');
    const [qrBase64, setQrBase64] = useState<string>('');
    const [photoBase64, setPhotoBase64] = useState<string>('');

    useEffect(() => {
        const loadLogo = async () => {
            try {
                const response = await fetch(logo);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onload = () => setLogoBase64(reader.result as string);
                reader.readAsDataURL(blob);
            } catch (error) {
                console.error('Failed to load logo:', error);
            }
        };

        const loadQr = async () => {
            try {
                const response = await fetch(siteQr);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onload = () => setQrBase64(reader.result as string);
                reader.readAsDataURL(blob);
            } catch (error) {
                console.error('Failed to load QR code:', error);
            }
        };

        const loadPhoto = async () => {
            if (visitor.photo) {
                try {
                    if (visitor.photo.startsWith('data:')) {
                        setPhotoBase64(visitor.photo);
                        return;
                    }
                    const response = await fetch(visitor.photo);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onload = () => setPhotoBase64(reader.result as string);
                    reader.readAsDataURL(blob);
                } catch (error) {
                    console.error('Failed to load visitor photo:', error);
                    setPhotoBase64(visitor.photo);
                }
            }
        };

        loadLogo();
        loadQr();
        loadPhoto();
    }, [visitor.photo]);

    return (
        /* 🔒 PRINT-SAFE WRAPPER (CRITICAL FIX) */
        <div className="print-badge-wrapper">
            <div className="visitor-badge-container">
                <div className="badge">
                    <div className="badge-header">
                        <span style={{
                            fontSize: '11px',
                            letterSpacing: '3px',
                            textTransform: 'uppercase',
                            opacity: 0.8,
                            marginBottom: '8px',
                            fontWeight: 500
                        }}>VISITOR PASS</span>
                        <img
                            src={customLogo || logoBase64 || logo}
                            alt="Company Logo"
                            className="badge-logo-img"
                            style={{ display: 'block' }}
                            onError={(e) => {
                                console.error('Logo failed to load from:', logo);
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML += '<h2 style="margin:0;color:white;">Soochak Bharat</h2>';
                            }}
                        />
                    </div>

                    <div className="badge-content">
                        <div className="badge-photo-container">
                            {(photoBase64 || visitor.photo) ? (
                                <img
                                    src={photoBase64 || visitor.photo}
                                    className="badge-photo"
                                    alt="Visitor"
                                    onError={(e) => {
                                        console.error('Visitor photo failed to load');
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="badge-photo-placeholder">PHOTO</div>
                            )}
                        </div>

                        <h1 className="badge-name">{visitor.name}</h1>
                        <p className="badge-company">
                            {visitor.company || 'Private Guest'}
                        </p>

                        <div className="badge-divider"></div>

                        <div className="badge-grid">
                            <div className="grid-item">
                                <span className="label">Host</span>
                                <span className="value">
                                    {visitor.purpose || 'Visit'}
                                </span>
                            </div>
                            <div className="grid-item">
                                <span className="label">Date</span>
                                <span className="value">
                                    {new Date(visitor.check_in_time).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="badge-footer-new">
                        <div className="footer-left">
                            <span className="website-url">
                                www.soochakbharat.com
                            </span>
                            <div className="badge-id-small">
                                ID: #{visitor.id.toString().padStart(6, '0')}
                            </div>
                        </div>
                        <div className="footer-right">
                            <img
                                src={qrBase64 || siteQr}
                                alt="QR"
                                className="site-qr"
                                onError={(e) => {
                                    console.error('QR code failed to load');
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisitorBadge;
