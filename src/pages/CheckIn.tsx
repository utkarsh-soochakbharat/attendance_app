import React, { useState, useEffect, useRef } from 'react';
import VisitorBadge from '../components/VisitorBadge';
import { useLocation, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import api from '../utils/api';
import FaceAuthModal from '../components/FaceAuthModal';

const CheckIn = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', host_employee: '', purpose: '' });
    const [lastVisitor, setLastVisitor] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [customLogo, setCustomLogo] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(true);
    const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Camera State
    const [photo, setPhoto] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        if (location.state) {
            setForm(prev => ({ ...prev, ...location.state }));
        }
    }, [location.state]);

    // Clean up stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    const startCamera = async () => {
        try {
            setIsCameraOpen(true);

            // Check permissions first to avoid unnecessary errors
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                    if (permissionStatus.state === 'denied') {
                        setIsCameraOpen(false);
                        // Silently handle - user needs to change browser settings
                        return;
                    }
                } catch (permErr) {
                    // Permissions API not supported or failed, continue with getUserMedia
                }
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            setIsCameraOpen(false);

            // Completely suppress permission denied errors - no alerts, no console logs
            if (err.name === 'NotAllowedError' ||
                err.code === 0 ||
                err.message?.toLowerCase().includes('permission') ||
                err.message?.toLowerCase().includes('denied')) {
                // Silently return - user can grant permission via browser settings
                return;
            }

            let errorMessage = "Could not access camera.";

            if (err.name === 'NotFoundError' || err.code === 8) {
                errorMessage = "No camera found.\n\nPlease connect a camera device and try again.";
            } else if (err.name === 'NotReadableError' || err.code === 4) {
                errorMessage = "Camera is already in use by another application.\n\nPlease close other apps using the camera and try again.";
            } else {
                // Only show alert for unexpected errors
                errorMessage = "Camera access failed.\n\nPlease check:\n1. Camera permissions are enabled\n2. No other app is using the camera\n3. Camera is properly connected";
            }

            // Only log unexpected errors (not permission errors)
            if (err.name !== 'NotAllowedError') {
                console.warn("Camera access issue:", err.name || err.message);
            }
            alert(errorMessage);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                // Set canvas dimensions to match video
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;

                // Draw image
                context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

                // Get data URL
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setPhoto(dataUrl);

                // Stop stream
                stopCamera();
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraOpen(false);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...form, email: form.email || '', photo: photo || null };
            const res = await api.addVisitor(payload);
            if (res.success) {
                const newVisitor = { ...payload, id: res.id, check_in_time: new Date().toISOString() };
                setLastVisitor(newVisitor);
                setShowModal(true);
                // Reset form
                setForm({ name: '', phone: '', email: '', company: '', host_employee: '', purpose: '' });
                setPhoto(null);
                // Keep customLogo for next check-in as convenience, or reset? Let's keep it.
                // setCustomLogo(null);
            } else {
                alert('Error: ' + res.error);
            }
        } catch (e) {
            console.error(e);
        }
    }

    // --- REPLACE ONLY handlePrint FUNCTION ---

    const handleDownloadImage = async () => {
        const printArea = document.getElementById('print-area');
        if (!printArea) return;

        try {
            const canvas = await html2canvas(printArea, {
                scale: 2, // Higher quality
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const image = canvas.toDataURL('image/jpeg', 1.0);
            const link = document.createElement('a');
            link.href = image;
            link.download = `VisitorBadge_${lastVisitor?.name || 'visitor'}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Error downloading image:", err);
            alert("Could not download badge image.");
        }
    };

    const handlePrint = async () => {
        const printArea = document.getElementById('print-area');
        if (!printArea) return;

        // Ensure visible
        printArea.style.display = 'block';
        printArea.style.visibility = 'visible';

        // Wait for fonts
        if (document.fonts) {
            await document.fonts.ready;
        }

        // Wait for images
        const images = printArea.querySelectorAll('img');
        await Promise.all(
            Array.from(images).map(img => {
                if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
                return new Promise(res => {
                    img.onload = res;
                    img.onerror = res;
                    setTimeout(res, 1500);
                });
            })
        );

        // Force layout stabilization
        printArea.getBoundingClientRect();
        document.body.offsetHeight;

        // Small delay for Chromium
        setTimeout(() => {
            window.print();
        }, 300);
    };


    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '2rem' }}>
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
                requiredRoles={['HR', 'Founder', 'Manager', 'Receptionist']}
                title="Visitor Check-In - Authentication Required"
            />

            {!isAuthenticated ? (
                <div style={{ textAlign: 'center', padding: '3rem', width: '100%' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Please authenticate to access visitor check-in</p>
                </div>
            ) : (
                <>
                    <div style={{ flex: 1 }}>
                        <h1>Visitor Check-In</h1>
                        {authenticatedUser && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px' }}>
                                Authenticated as: {authenticatedUser.name}
                            </p>
                        )}
                        <div className="card" style={{ marginTop: '1.5rem' }}>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Visitor Name</label>
                                    <input className="form-input" name="name" required value={form.name} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    <input className="form-input" name="phone" required value={form.phone} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email (Optional)</label>
                                    <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Company</label>
                                    <input className="form-input" name="company" value={form.company} onChange={handleChange} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Badge Logo (Optional)</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <button
                                            type="button"
                                            className="btn"
                                            onClick={() => logoInputRef.current?.click()}
                                            style={{ border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                        >
                                            {customLogo ? 'Change Logo' : 'Upload Company Logo'}
                                        </button>
                                        {customLogo && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Logo selected
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomLogo(null)}
                                                    style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={logoInputRef}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Host</label>
                                    <input className="form-input" name="purpose" value={form.purpose} onChange={handleChange} />
                                </div>
                                <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Check In & Print Badge</button>
                            </form>
                        </div>
                    </div>

                    {/* Camera Section */}
                    <div style={{ width: '300px' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Visitor Photo</h3>
                        <div className="card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>

                            {isCameraOpen ? (
                                <div style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'black' }}>
                                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%' }} />
                                </div>
                            ) : photo ? (
                                <div style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                                    <img src={photo} alt="Captured" style={{ width: '100%' }} />
                                </div>
                            ) : (
                                <div style={{ width: '100%', aspectRatio: '1/1', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    No Photo
                                </div>
                            )}

                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleFileUpload}
                            />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                    {!isCameraOpen ? (
                                        <button className="btn" type="button" onClick={startCamera} style={{ flex: 1, border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                                            {photo ? 'Retake Photo' : 'Open Camera'}
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                            <button className="btn btn-primary" type="button" onClick={capturePhoto} style={{ flex: 1 }}>
                                                Capture
                                            </button>
                                            <button className="btn" type="button" onClick={stopCamera} style={{ background: 'var(--danger)', color: 'white' }}>
                                                X
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {!isCameraOpen && (
                                    <button className="btn" type="button" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                                        Upload Photo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Modal / Print Area */}
                    {showModal && lastVisitor && (
                        <div className="print-modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                            <div className="print-modal-content" style={{ padding: '0', maxWidth: '400px', width: '90%', border: '1px solid rgba(255,255,255,0.1)', overflow: "hidden" }}>
                                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Ready to Print</h2>
                                    <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                                </div>

                                <div className="print-preview-container" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', background: '#e2e8f0' }}>
                                    {/* Wrapper for Print Area */}
                                    <div id="print-area" className="print-area">
                                        <VisitorBadge visitor={lastVisitor} customLogo={customLogo || undefined} />
                                    </div>
                                </div>

                                <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', background: 'var(--bg-glass-strong)' }}>
                                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }} onClick={() => setShowModal(false)}>Close</button>
                                    <button className="btn" style={{ background: 'var(--secondary)', color: 'white' }} onClick={handleDownloadImage}>Download JPG</button>
                                    <button className="btn btn-primary" onClick={handlePrint}>Print Badge</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CheckIn;
