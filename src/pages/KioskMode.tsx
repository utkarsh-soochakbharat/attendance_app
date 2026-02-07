import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import api from '../utils/api';
import { getModelUrl } from '../utils/modelLoader';

const KioskMode = () => {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [recognizedEmployee, setRecognizedEmployee] = useState<any>(null);
    const [message, setMessage] = useState('Initializing...');
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [lastRecognitionTime, setLastRecognitionTime] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const detectionIntervalRef = useRef<any>(null);

    useEffect(() => {
        loadModels();
        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, []);

    const loadModels = async () => {
        try {
            setMessage('Loading face recognition models...');
            const MODEL_URL = getModelUrl();
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
            setMessage('Starting camera...');
            await startCamera();
        } catch (error) {
            console.error('Error loading models:', error);
            setMessage('Failed to load face recognition models');
            setMessageType('error');
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                videoRef.current.onloadedmetadata = () => {
                    if (canvasRef.current && videoRef.current) {
                        canvasRef.current.width = videoRef.current.videoWidth;
                        canvasRef.current.height = videoRef.current.videoHeight;
                    }
                    setMessage('Ready! Please look at the camera');
                    setMessageType('info');
                    startDetection();
                };
            }
        } catch (error) {
            console.error('Camera error:', error);
            setMessage('Camera access denied. Please allow camera access.');
            setMessageType('error');
        }
    };

    const startDetection = () => {
        setDetecting(true);
        detectionIntervalRef.current = setInterval(async () => {
            await detectAndRecognize();
        }, 500); // Check every 500ms
    };

    const detectAndRecognize = async () => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

        try {
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
                    inputSize: 416,
                    scoreThreshold: 0.5
                }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            // Clear canvas
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }

            if (detection) {
                // Draw detection box
                const box = detection.detection.box;
                if (ctx) {
                    ctx.strokeStyle = '#10b981';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);
                }

                // Prevent rapid re-recognition (cooldown of 10 seconds)
                const now = Date.now();
                if (now - lastRecognitionTime < 10000) {
                    return;
                }

                await recognizeFace(detection.descriptor);
            }
        } catch (error) {
            console.error('Detection error:', error);
        }
    };

    const recognizeFace = async (descriptor: Float32Array) => {
        try {
            const response = await api.getEmployees();
            const employees = response;

            let bestMatch: any = null;
            let bestDistance = 1.0;

            for (const emp of employees) {
                if (emp.face_descriptor) {
                    try {
                        const savedDescriptor = new Float32Array(JSON.parse(emp.face_descriptor));
                        const distance = faceapi.euclideanDistance(descriptor, savedDescriptor);

                        if (distance < bestDistance) {
                            bestDistance = distance;
                            bestMatch = emp;
                        }
                    } catch (e) {
                        console.error('Error parsing descriptor for employee:', emp.id);
                    }
                }
            }

            if (bestMatch && bestDistance < 0.6) {
                setLastRecognitionTime(Date.now());
                await markAttendance(bestMatch);
            } else if (bestDistance >= 0.6) {
                setMessage('Face not recognized. Please register first.');
                setMessageType('error');
                setTimeout(() => {
                    setMessage('Ready! Please look at the camera');
                    setMessageType('info');
                }, 3000);
            }
        } catch (error) {
            console.error('Recognition error:', error);
            setMessage('Recognition error. Please try again.');
            setMessageType('error');
        }
    };

    const markAttendance = async (employee: any) => {
        try {
            await api.markAttendance({
                employee_id: employee.id,
                type: 'check-in'
            });

            setRecognizedEmployee(employee);
            setMessage(`✓ Welcome ${employee.name}!`);
            setMessageType('success');

            setTimeout(() => {
                setRecognizedEmployee(null);
                setMessage('Ready! Please look at the camera');
                setMessageType('info');
            }, 5000);
        } catch (error: any) {
            setMessage(error.message || 'Failed to mark attendance');
            setMessageType('error');
            setTimeout(() => {
                setMessage('Ready! Please look at the camera');
                setMessageType('info');
            }, 3000);
        }
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            overflow: 'hidden',
            padding: '20px'
        }}>
            <h1 style={{ fontSize: '48px', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                🏢 Biometric Attendance
            </h1>
            <p style={{ fontSize: '20px', marginBottom: '30px', opacity: 0.9 }}>
                {modelsLoaded ? 'System Ready' : 'Loading...'}
            </p>

            <div style={{
                width: '640px',
                height: '480px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: '30px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}>
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)' // Mirror effect
                    }}
                />
                <canvas
                    ref={canvasRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transform: 'scaleX(-1)' // Mirror effect
                    }}
                />

                {detecting && (
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(16, 185, 129, 0.8)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}>
                        ● SCANNING
                    </div>
                )}
            </div>

            {message && (
                <div style={{
                    padding: '20px 40px',
                    borderRadius: '12px',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    background: messageType === 'success' ? '#10b981' : messageType === 'error' ? '#ef4444' : '#3b82f6',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    textAlign: 'center',
                    maxWidth: '80%'
                }}>
                    {message}
                </div>
            )}

            {recognizedEmployee && (
                <div style={{
                    marginTop: '20px',
                    textAlign: 'center',
                    fontSize: '24px',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '20px',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                }}>
                    <p style={{ margin: '5px 0' }}>👤 {recognizedEmployee.name}</p>
                    <p style={{ margin: '5px 0' }}>🆔 {recognizedEmployee.employee_id}</p>
                    <p style={{ margin: '5px 0' }}>🏢 {recognizedEmployee.department}</p>
                    <p style={{ margin: '5px 0', fontSize: '18px', opacity: 0.8 }}>
                        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            )
            }

            <p style={{
                position: 'absolute',
                bottom: '20px',
                fontSize: '18px',
                opacity: 0.8,
                textAlign: 'center'
            }}>
                👁️ Please look directly at the camera<br />
                <span style={{ fontSize: '14px' }}>Stand 2-3 feet away for best results</span>
            </p>
        </div >
    );
};

export default KioskMode;
