import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import api from '../utils/api';

interface AdminVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: (employee: any) => void;
}

const MODEL_URL = '/models'; // Ensure this path is correct based on your setup

const AdminVerificationModal: React.FC<AdminVerificationModalProps> = ({ isOpen, onClose, onVerified }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('Initializing camera...');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadModelsAndData();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const loadModelsAndData = async () => {
        try {
            setStatus('scanning');
            // Load Employees
            const empData = await api.getEmployees();
            setEmployees(empData);

            // Load Models
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            setModelsLoaded(true);
            startCamera();
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage('Failed to load system resources.');
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setStatus('error');
            setMessage('Camera access denied.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
    };

    const scanFace = async () => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

        setStatus('verifying');
        setMessage('Verifying identity...');

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Ensure dimensions match
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        if (context) context.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setStatus('error');
                setMessage('No face detected. Please try again.');
                setTimeout(() => setStatus('scanning'), 2000);
                return;
            }

            const currentDescriptor = detection.descriptor;
            let bestMatch: any = null;
            let bestDistance = 0.6;

            for (const emp of employees) {
                if (emp.face_descriptor) {
                    try {
                        let descriptorData;
                        if (typeof emp.face_descriptor === 'string') {
                            descriptorData = JSON.parse(emp.face_descriptor);
                        } else {
                            descriptorData = emp.face_descriptor;
                        }
                        const storedDescriptor = new Float32Array(descriptorData);
                        const distance = faceapi.euclideanDistance(currentDescriptor, storedDescriptor);
                        if (distance < bestDistance) {
                            bestDistance = distance;
                            bestMatch = emp;
                        }
                    } catch (e) {
                        console.error("Error parsing descriptor", e)
                    }
                }
            }

            if (bestMatch) {
                // Check Authorization
                const authorizedRoles = ['Admin', 'Manager', 'HR', 'SecurityHead']; // Add appropriate roles
                const authorizedDepts = ['IT', 'Administration', 'Security'];

                const isAuthorized =
                    authorizedRoles.some(role => bestMatch.designation?.toLowerCase().includes(role.toLowerCase())) ||
                    authorizedDepts.some(dept => bestMatch.department?.toLowerCase().includes(dept.toLowerCase()));

                if (isAuthorized) {
                    setStatus('success');
                    setMessage(`Access Granted: ${bestMatch.name}`);
                    setTimeout(() => {
                        onVerified(bestMatch);
                        // Parent component will handle closing
                        // onClose();
                    }, 1000);
                } else {
                    setStatus('error');
                    setMessage(`Access Denied: ${bestMatch.name} is not authorized.`);
                }
            } else {
                setStatus('error');
                setMessage('Face not recognized in employee database.');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage('Verification failed.');
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(10px)'
        }}>
            <div className="card" style={{ maxWidth: '500px', width: '90%', textAlign: 'center', padding: '2rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Security Check</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Restricted Area. Please verify your identity.
                </p>

                <div style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16/9',
                    background: '#000',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '1.5rem',
                    boxShadow: status === 'success' ? '0 0 0 4px #10b981' : status === 'error' ? '0 0 0 4px #ef4444' : 'none'
                }}>
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Scanning Overlay */}
                    {status === 'scanning' && (
                        <div style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.2), transparent)',
                            animation: 'scan 2s infinite linear'
                        }} />
                    )}
                </div>

                <div style={{ minHeight: '3rem', marginBottom: '1rem', fontWeight: '500', color: status === 'error' ? 'var(--danger)' : status === 'success' ? '#10b981' : 'white' }}>
                    {message}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={scanFace}
                        disabled={status === 'verifying' || !modelsLoaded}
                    >
                        {status === 'verifying' ? 'Verifying...' : 'Scan Face'}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
            `}</style>
        </div>
    );
};

export default AdminVerificationModal;
