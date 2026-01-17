import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import api from '../utils/api';

const EmployeeRegistration = () => {
    const [form, setForm] = useState({
        employee_id: '',
        name: '',
        email: '',
        phone: '',
        department: '',
        designation: '',
        office_id: ''
    });
    const [offices, setOffices] = useState<any[]>([]);
    const [photo, setPhoto] = useState<string | null>(null);
    const [faceDescriptor, setFaceDescriptor] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        loadModels();
        loadOffices();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const loadOffices = async () => {
        try {
            const data = await api.getOfficeLocations();
            setOffices(data);
        } catch (error) {
            console.error('Failed to load offices:', error);
        }
    };

    const loadModels = async () => {
        try {
            const MODEL_URL = '/models';
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            setModelsLoaded(true);
            console.log('Face recognition models loaded');
        } catch (error) {
            console.error('Error loading models:', error);
            alert('Failed to load face recognition models. Please refresh the page.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const startCamera = async () => {
        try {
            setIsCameraOpen(true);
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please check permissions.");
            setIsCameraOpen(false);
        }
    };

    const capturePhoto = async () => {
        if (!modelsLoaded) {
            alert('Face recognition models are still loading. Please wait.');
            return;
        }

        if (videoRef.current && canvasRef.current) {
            setIsProcessing(true);
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

                // Detect face and get descriptor
                const detection = await faceapi
                    .detectSingleFace(canvasRef.current, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                    setPhoto(dataUrl);
                    setFaceDescriptor(JSON.stringify(Array.from(detection.descriptor)));
                    stopCamera();
                    alert('Face captured successfully!');
                } else {
                    alert('No face detected. Please ensure your face is clearly visible and try again.');
                }
            }
            setIsProcessing(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraOpen(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && modelsLoaded) {
            setIsProcessing(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const img = new Image();
                img.src = reader.result as string;
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);

                        const detection = await faceapi
                            .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
                            .withFaceLandmarks()
                            .withFaceDescriptor();

                        if (detection) {
                            setPhoto(reader.result as string);
                            setFaceDescriptor(JSON.stringify(Array.from(detection.descriptor)));
                            alert('Face detected and processed successfully!');
                        } else {
                            alert('No face detected in the uploaded image. Please use a clear photo.');
                        }
                    }
                    setIsProcessing(false);
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!photo || !faceDescriptor) {
            alert('Please capture or upload a photo with face detection.');
            return;
        }

        try {
            const payload = {
                ...form,
                office_id: form.office_id ? parseInt(form.office_id) : null,
                photo,
                face_descriptor: faceDescriptor
            };

            const res = await api.registerEmployee(payload);
            if (res.success) {
                alert('Employee registered successfully!');
                setForm({
                    employee_id: '',
                    name: '',
                    email: '',
                    phone: '',
                    department: '',
                    designation: '',
                    office_id: ''
                });
                setPhoto(null);
                setFaceDescriptor(null);
            } else {
                alert('Error: ' + res.error);
            }
        } catch (error: any) {
            console.error(error);
            alert('Failed to register employee: ' + (error.message || 'Unknown error'));
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h1>Employee Registration</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Register employees with face recognition for automated attendance tracking
            </p>

            <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                    <div className="card">
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Employee ID *</label>
                                <input
                                    className="form-input"
                                    name="employee_id"
                                    required
                                    value={form.employee_id}
                                    onChange={handleChange}
                                    placeholder="EMP001"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input
                                    className="form-input"
                                    name="name"
                                    required
                                    value={form.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    className="form-input"
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input
                                    className="form-input"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <input
                                    className="form-input"
                                    name="department"
                                    value={form.department}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Designation</label>
                                <input
                                    className="form-input"
                                    name="designation"
                                    value={form.designation}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assigned Office</label>
                                <select
                                    className="form-input"
                                    name="office_id"
                                    value={form.office_id}
                                    onChange={(e) => setForm({ ...form, office_id: e.target.value })}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <option value="">No Office (Optional)</option>
                                    {offices.map(office => (
                                        <option key={office.id} value={office.id}>
                                            {office.name} ({office.radius}m radius)
                                        </option>
                                    ))}
                                </select>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    If assigned, employee can only mark attendance at this office location
                                </div>
                            </div>
                            <button
                                className="btn btn-primary"
                                type="submit"
                                style={{ width: '100%' }}
                                disabled={!photo || !faceDescriptor || isProcessing}
                            >
                                {isProcessing ? 'Processing...' : 'Register Employee'}
                            </button>
                        </form>
                    </div>
                </div>

                <div style={{ width: '350px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Face Capture</h3>


                    <div className="card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        {isCameraOpen ? (
                            <div style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'black' }}>
                                <video ref={videoRef} autoPlay playsInline style={{ width: '100%' }} />
                            </div>
                        ) : photo ? (
                            <div style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                                <img src={photo} alt="Captured" style={{ width: '100%' }} />
                                {faceDescriptor && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        background: 'rgba(34, 197, 94, 0.9)',
                                        color: 'white',
                                        padding: '5px 10px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}>
                                        ✓ Face Detected
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{
                                width: '100%',
                                aspectRatio: '1/1',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '48px' }}></span>
                                <span>No Photo</span>
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
                            {!isCameraOpen ? (
                                <>
                                    <button
                                        className="btn"
                                        type="button"
                                        onClick={startCamera}
                                        disabled={!modelsLoaded || isProcessing}
                                        style={{ width: '100%', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                    >
                                        {photo ? 'Retake Photo' : 'Open Camera'}
                                    </button>
                                    <button
                                        className="btn"
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={!modelsLoaded || isProcessing}
                                        style={{ width: '100%', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                    >
                                        Upload Photo
                                    </button>
                                </>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                    <button
                                        className="btn btn-primary"
                                        type="button"
                                        onClick={capturePhoto}
                                        disabled={isProcessing}
                                        style={{ flex: 1 }}
                                    >
                                        {isProcessing ? 'Processing...' : 'Capture Face'}
                                    </button>
                                    <button
                                        className="btn"
                                        type="button"
                                        onClick={stopCamera}
                                        style={{ background: 'var(--danger)', color: 'white' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeRegistration;
