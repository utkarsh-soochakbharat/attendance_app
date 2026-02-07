import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import api from '../utils/api';
import { getModelUrl } from '../utils/modelLoader';

interface FaceAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthenticated: (employee: any) => void;
    requiredRoles?: string[]; // e.g., ['HR', 'Founder', 'Manager']
    title?: string;
}

const FaceAuthModal = ({
    isOpen,
    onClose,
    onAuthenticated,
    requiredRoles = ['HR', 'Founder', 'Manager'],
    title = 'Face Authentication Required'
}: FaceAuthModalProps) => {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadModels();
            loadEmployees();
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const loadModels = async () => {
        try {
            const MODEL_URL = getModelUrl();
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            setModelsLoaded(true);
        } catch (error) {
            console.error('Error loading models:', error);
            setError('Failed to load face recognition models');
        }
    };

    const loadEmployees = async () => {
        try {
            const data = await api.getEmployees();
            setEmployees(data);
        } catch (error) {
            console.error('Failed to load employees:', error);
        }
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
            }
        } catch (error) {
            console.error('Camera error:', error);
            setError('Failed to access camera');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const recognizeFace = async () => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

        setIsProcessing(true);
        setError(null);

        try {
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setError('No face detected. Please position your face clearly.');
                setIsProcessing(false);
                return;
            }

            let bestMatch: any = null;
            let bestDistance = Infinity;

            for (const employee of employees) {
                if (!employee.face_descriptor || !employee.is_active) continue;

                const storedDescriptor = new Float32Array(employee.face_descriptor);
                const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = employee;
                }
            }

            const threshold = 0.6;
            if (bestMatch && bestDistance < threshold) {
                // Check if employee has required role
                const hasPermission = requiredRoles.some(role =>
                    bestMatch.designation?.toLowerCase().includes(role.toLowerCase()) ||
                    bestMatch.department?.toLowerCase().includes(role.toLowerCase())
                );

                if (hasPermission) {
                    stopCamera();
                    onAuthenticated(bestMatch);
                } else {
                    setError(`Access denied. This feature requires ${requiredRoles.join(' or ')} privileges.`);
                }
            } else {
                setError('Face not recognized or not authorized.');
            }
        } catch (error) {
            console.error('Recognition error:', error);
            setError('Recognition failed. Please try again.');
        }

        setIsProcessing(false);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(5px)'
        }}>
            <div className="card" style={{
                maxWidth: '500px',
                width: '90%',
                padding: '30px',
                position: 'relative'
            }}>
                <button
                    onClick={() => {
                        stopCamera();
                        onClose();
                    }}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                    }}
                >
                    ×
                </button>

                <h2 style={{ marginBottom: '10px' }}>{title}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px' }}>
                    Required: {requiredRoles.join(', ')} access
                </p>

                <div style={{ marginBottom: '20px' }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{
                            width: '100%',
                            borderRadius: '12px',
                            backgroundColor: 'black'
                        }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                {error && (
                    <div style={{
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        borderRadius: '8px',
                        color: '#ef4444',
                        marginBottom: '15px',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    className="btn btn-primary"
                    onClick={recognizeFace}
                    disabled={isProcessing || !modelsLoaded}
                    style={{ width: '100%', padding: '14px', fontSize: '16px' }}
                >
                    {isProcessing ? 'Authenticating...' : modelsLoaded ? 'Authenticate' : 'Loading...'}
                </button>
            </div>
        </div>
    );
};

export default FaceAuthModal;
