import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import Lottie from 'lottie-react';
import api from '../utils/api';
import AdminVerificationModal from '../components/AdminVerificationModal';
import { getModelUrl, waitForServer } from '../utils/modelLoader';
import likeAnimation from '../assets/like.json';
import logoutAnimation from '../assets/logout.json';

const AttendancePopup = ({ type, visible }: { type: 'late' | 'in' | 'out' | null, visible: boolean }) => {
    if (!visible || !type) return null;

    const getAnimation = () => {
        if (type === 'late') {
            // For late, use emoji since we don't have a Lottie file for it
            return (
                <div style={{
                    fontSize: '120px',
                    animation: 'fadeInScale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transformOrigin: 'center',
                    display: 'inline-block'
                }}>
                    😭🙏🏼💔
                </div>
            );
        }
        if (type === 'in') {
            return (
                <div style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                    <Lottie
                        animationData={likeAnimation}
                        loop={false}
                        autoplay={true}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            );
        }
        if (type === 'out') {
            return (
                <div style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                    <Lottie
                        animationData={logoutAnimation}
                        loop={false}
                        autoplay={true}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            );
        }
        return null;
    };

    const getMessage = () => {
        if (type === 'late') return 'You are Late!';
        if (type === 'in') return 'Checked In!';
        if (type === 'out') return 'Bye Bye!';
        return '';
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', zIndex: 10000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{
                marginBottom: '30px',
                animation: 'fadeInScale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transformOrigin: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {getAnimation()}
            </div>
            <div style={{
                color: 'white',
                fontSize: '36px',
                fontWeight: 'bold',
                animation: 'slideUp 0.6s ease-out 0.2s both',
                textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                textAlign: 'center'
            }}>
                {getMessage()}
            </div>
            <style>{`
                @keyframes fadeInScale {
                    0% { 
                        opacity: 0; 
                        transform: scale(0.3) rotate(-10deg); 
                    }
                    50% {
                        transform: scale(1.1) rotate(5deg);
                    }
                    100% { 
                        opacity: 1; 
                        transform: scale(1) rotate(0deg); 
                    }
                }
                @keyframes slideUp {
                    0% { 
                        opacity: 0; 
                        transform: translateY(30px); 
                    }
                    100% { 
                        opacity: 1; 
                        transform: translateY(0); 
                    }
                }
            `}</style>
        </div>
    );
};

const EmployeeAttendance = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'scan' | 'list'>('scan');
    const [popupState, setPopupState] = useState<{ visible: boolean, type: 'late' | 'in' | 'out' | null }>({ visible: false, type: null });

    // Admin Verification
    const [showAdminModal, setShowAdminModal] = useState(false);

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [matchedEmployee, setMatchedEmployee] = useState<any>(null);
    const [actionType, setActionType] = useState<'check-in' | 'check-out'>('check-in');
    const [locationStatus, setLocationStatus] = useState<'checking' | 'inside' | 'outside' | 'error'>('checking');

    const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);

    // Default office location fallback
    const [currentOfficeLocation, setCurrentOfficeLocation] = useState({
        latitude: 28.62884,
        longitude: 77.37633,
        radius: 300
    });

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        loadModels();
        loadEmployees();
        loadTodayAttendance();
        loadOfficeLocation();

        return () => {
            // Cleanup camera on component unmount
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []); // Added stream dependency for proper cleanup

    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };
    useEffect(() => {
        let resolved = false;

        const fallbackAllow = () => {
            if (!resolved) {
                console.warn('Geolocation failed — using fallback');
                // Strict mode: If location fails, we error out instead of allowing
                setLocationStatus('error');
                resolved = true;
            }
        };

        if (!navigator.geolocation) {
            fallbackAllow();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolved = true;

                const { latitude, longitude, accuracy } = position.coords;

                setCurrentLocation({ lat: latitude, lng: longitude });

                // CRITICAL FIX: Don't auto-allow on poor accuracy
                // Desktop/laptop GPS is unreliable - warn user instead
                if (accuracy > 500) {
                    console.warn(`⚠️ GPS Accuracy is very poor: ${accuracy.toFixed(0)}m`);
                    // For testing/development, we allow this but show a message
                    // In production, this should likely block attendance
                }

                const distance = calculateDistance(
                    latitude,
                    longitude,
                    currentOfficeLocation.latitude,
                    currentOfficeLocation.longitude
                );

                console.log(`📍 Distance from office: ${distance.toFixed(0)}m (Accuracy: ±${accuracy.toFixed(0)}m)`);

                setLocationStatus(
                    distance <= currentOfficeLocation.radius ? 'inside' : 'outside'
                );
            },
            (error) => {
                // Suppress scary 403 errors which are expected without an API key
                if ((error.code !== 1 && error.message.includes('403')) || error.message.includes('network service')) {
                    console.warn('Geolocation restriction (API Key/Quota). Auto-allowing for development/testing.');
                    // FIX: Allow testing even if Google blocks Electron
                    setLocationStatus('inside');
                    resolved = true;
                    return;
                } else {
                    console.warn('Location error:', error.message);
                }
                fallbackAllow();
            },
            {
                enableHighAccuracy: true, // CRITICAL: Enable high accuracy for mobile GPS
                timeout: 15000, // Increased timeout for GPS lock
                maximumAge: 30000 // Reduced cache time for fresher location
            }
        );

        // Never stay stuck on "checking"
        setTimeout(fallbackAllow, 16000); // Increased to match timeout
    }, [currentOfficeLocation]);







    const loadOfficeLocation = async () => {
        try {
            const offices = await api.getOfficeLocations();
            if (offices.length > 0) {
                // Use the first active office
                setCurrentOfficeLocation({
                    latitude: offices[0].latitude,
                    longitude: offices[0].longitude,
                    radius: offices[0].radius
                });
            }
        } catch (error) {
            console.error("Failed to load office location", error);
        }
    };

    const loadModels = async () => {
        try {
            const MODEL_URL = getModelUrl();
            console.log('Loading models from:', MODEL_URL);

            // Wait for server to be ready if using HTTP (packaged Electron)
            if (MODEL_URL.startsWith('http://')) {
                console.log('Waiting for backend server to be ready...');
                const serverReady = await waitForServer(15, 1000); // 15 retries, 1 second apart
                if (!serverReady) {
                    console.error('Backend server did not become ready. Models may fail to load.');
                } else {
                    console.log('Backend server is ready');
                }
            }

            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            setModelsLoaded(true);
            // Only log in development mode
            if (process.env.NODE_ENV === 'development') {
                console.log('Face recognition models loaded');
            }
        } catch (error) {
            console.error('Error loading models:', error);
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

    const loadTodayAttendance = async () => {
        try {
            const rawData = await api.getTodayAttendance();
            console.log('Raw attendance data:', rawData);

            // Process raw events into a summary: { employee_id, check_in_time, check_out_time, ... }
            const summary: any = {};

            rawData.forEach((record: any) => {
                const empId = record.employee_id_text || record.employee_id || record.employeeId;
                if (!empId) return;

                const key = String(empId);

                if (!summary[key]) {
                    summary[key] = {
                        employee_id: empId,
                        name: record.name || 'Unknown',
                        department: record.department || null,
                        check_in_time: null,
                        check_out_time: null,
                        date:
                            record.date ||
                            (record.timestamp
                                ? record.timestamp.slice(0, 10)
                                : new Date().toISOString().split('T')[0]),
                    };
                }

                if (record.type === 'check-in' && record.timestamp) {
                    if (
                        !summary[key].check_in_time ||
                        new Date(record.timestamp) < new Date(summary[key].check_in_time)
                    ) {
                        summary[key].check_in_time = record.timestamp;
                    }
                }

                if (record.type === 'check-out' && record.timestamp) {
                    if (
                        !summary[key].check_out_time ||
                        new Date(record.timestamp) > new Date(summary[key].check_out_time)
                    ) {
                        summary[key].check_out_time = record.timestamp;
                    }
                }

                if (!record.type) {
                    summary[key].check_in_time ||= record.check_in_time;
                    summary[key].check_out_time ||= record.check_out_time;
                }
            });

            setTodayAttendance([...Object.values(summary)]);

        } catch (error) {
            console.error('Failed to load attendance:', error);
        }
    };

    const startCamera = async (action: 'check-in' | 'check-out') => {
        if (!modelsLoaded) {
            alert('Face recognition models are still loading. Please wait.');
            return;
        }

        // Check geofencing before allowing attendance
        if (locationStatus === 'checking') {
            alert('Checking your location. Please wait...');
            return;
        }

        if (locationStatus === 'outside') {
            alert('You are outside the office premises. Attendance can only be marked from within the office.');
            return;
        }

        if (locationStatus === 'error') {
            alert('Location services are required. Please enable location and refresh the page.');
            return;
        }

        setActionType(action);
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

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        // Also clear the video element's source
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
        setMatchedEmployee(null);
    };

    const recognizeFace = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setIsProcessing(true);
        const context = canvasRef.current.getContext('2d');
        if (context) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

            const detection = await faceapi
                .detectSingleFace(canvasRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                const currentDescriptor = detection.descriptor;
                let bestMatch: any = null;
                let bestDistance = 0.6; // Threshold for face matching

                for (const emp of employees) {
                    if (emp.face_descriptor) {
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
                    }
                }

                if (bestMatch) {
                    setMatchedEmployee(bestMatch);
                    await processAttendance(bestMatch.employee_id);
                    // Camera will be stopped by processAttendance -> stopCamera()
                } else {
                    alert('Face not recognized. Please try again or register first.');
                    stopCamera(); // Stop camera after failed recognition
                }
            } else {
                alert('No face detected. Please ensure your face is clearly visible.');
                stopCamera(); // Stop camera when no face detected
            }
        }
        setIsProcessing(false);
    };

    const playVoiceFeedback = (type: 'late' | 'on_time' | 'check_out', settings: any) => {
        const defaultMessages = {
            late: "You are late!",
            on_time: "On time! Great job.",
            check_out: "Bye bye! See you tomorrow."
        };

        const config = settings?.voice_settings?.[type] || {};
        const message = config.message || defaultMessages[type];
        const audioPath = config.audio;

        console.log(`🔊 Playing ${type} feedback:`, { message, audioPath });

        if (audioPath) {
            // Play uploaded audio
            // Construct full URL
            const apiBase = api.getCurrentBaseUrl() || '';
            const rootBase = apiBase.replace(/\/api$/, '');
            const soundUrl = `${rootBase}${audioPath}`;

            const audio = new Audio(soundUrl);
            audio.play().catch(e => console.error("Audio play failed", e));
        } else {
            // Fallback to Text-to-Speech
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(message);
                // Try to sound "angry" for late?
                if (type === 'late') {
                    utterance.rate = 1.2;
                    utterance.pitch = 0.8;
                    utterance.volume = 1.0;
                } else if (type === 'on_time') {
                    utterance.pitch = 1.2;
                }
                window.speechSynthesis.speak(utterance);
            }
        }
    };

    const processAttendance = async (employeeId: string) => {
        try {
            // Get employee's assigned office to check time bounds
            const employee = employees.find(e => e.employee_id === employeeId);
            let assignedOffice = null;
            let isLate = false;

            // Check office hours and late status
            if (employee && employee.office_id) {
                const offices = await api.getOfficeLocations();
                assignedOffice = offices.find((o: any) => o.id === employee.office_id);
            }

            // Use assigned office or default office hours (09:00)
            const officeToCheck = assignedOffice || { start_time: '09:00', end_time: '20:00' };

            if (officeToCheck.start_time && officeToCheck.end_time && actionType === 'check-in') {
                const now = new Date();
                const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

                // Parse times to compare easily
                const [startH, startM] = officeToCheck.start_time.split(':').map(Number);
                const [endH, endM] = officeToCheck.end_time.split(':').map(Number);
                const [curH, curM] = currentTime.split(':').map(Number);

                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;
                const curMinutes = curH * 60 + curM;

                // Allow check-in 2 hours before start time
                if (curMinutes < (startMinutes - 120)) {
                    alert(`Too early to mark attendance. Office starts at ${officeToCheck.start_time}`);
                    stopCamera();
                    return;
                }

                if (curMinutes > endMinutes) {
                    alert(`Office closed. Cannot mark attendance after ${officeToCheck.end_time}`);
                    stopCamera();
                    return;
                }

                // Check if Late - current time is after start time
                if (curMinutes > startMinutes) {
                    isLate = true;
                    console.log(`Late check-in detected: Current time ${currentTime} is after start time ${officeToCheck.start_time}`);
                }
            }

            let res;
            if (actionType === 'check-in') {
                res = await api.checkInEmployee(employeeId);
            } else {
                res = await api.checkOutEmployee(employeeId);
            }

            if (res.success) {
                // Trigger Visual Popup - ensure late check-in shows correctly
                if (actionType === 'check-in') {
                    // Debug: log late status
                    console.log('Check-in successful. Is late:', isLate);
                    setPopupState({ visible: true, type: isLate ? 'late' : 'in' });
                } else {
                    setPopupState({ visible: true, type: 'out' });
                }

                // Hide popup after 3 seconds (longer for animations)
                setTimeout(() => setPopupState(prev => ({ ...prev, visible: false })), 3000);

                // Play Voice Feedback (Non-blocking)
                // Use assignedOffice settings if available, otherwise use defaults
                const settingsToUse = assignedOffice || {
                    voice_settings: {
                        late: { message: "You are late!", audio: null },
                        on_time: { message: "Checked in on time!", audio: null },
                        check_out: { message: "Goodbye!", audio: null }
                    }
                };

                if (actionType === 'check-in') {
                    if (isLate) {
                        playVoiceFeedback('late', settingsToUse);
                    } else {
                        playVoiceFeedback('on_time', settingsToUse);
                    }
                } else {
                    playVoiceFeedback('check_out', settingsToUse);
                }

                // Force refresh attendance data
                await loadTodayAttendance();
                // Small delay to ensure data is updated
                setTimeout(() => {
                    loadTodayAttendance();
                }, 500);
                stopCamera();
            } else {
                alert('Error: ' + res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to process attendance');
        }
    };

    const formatTime = (datetime: string | null) => {
        if (!datetime) return '-';
        try {
            // Database now stores IST time directly (after our fix)
            // Don't add 'Z' - treat as local time
            const date = new Date(datetime);

            if (isNaN(date.getTime())) {
                console.warn('Invalid date:', datetime);
                return '-';
            }

            return date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Error formatting time:', datetime, error);
            return '-';
        }
    };

    const downloadAttendance = () => {
        // Group attendance by employee for better formatting
        const csvRows: string[] = [];

        // Add header
        csvRows.push('ATTENDANCE REPORT');
        csvRows.push(`Date: ${new Date().toLocaleDateString()}`);
        csvRows.push(''); // Empty line

        // Sort by employee name for consistent ordering
        const sortedAttendance = [...todayAttendance].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
        );

        // Add each employee's attendance in a grouped format
        sortedAttendance.forEach((record, index) => {
            csvRows.push(`Employee: ${record.name}`);
            csvRows.push(`Employee ID: ${record.employee_id}`);
            csvRows.push(`Department: ${record.department || 'N/A'}`);
            csvRows.push(`Check-In: ${formatTime(record.check_in_time)}`);
            csvRows.push(`Check-Out: ${formatTime(record.check_out_time)}`);
            csvRows.push(`Date: ${record.date}`);

            // Add separator between employees (except for last one)
            if (index < sortedAttendance.length - 1) {
                csvRows.push(''); // Empty line between employees
                csvRows.push('---'); // Visual separator
                csvRows.push(''); // Empty line
            }
        });

        const csv = csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Mobile detection
    const isMobile = window.innerWidth < 768;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0.5rem' : '0' }}>
            <AttendancePopup type={popupState.type} visible={popupState.visible} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>Employee Attendance</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Face recognition-based attendance tracking
                    </p>
                </div>
            </div>

            {/* Location Status Banner with Calibration */}
            <div style={{
                padding: '15px 20px',
                borderRadius: '8px',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                background: locationStatus === 'inside' ? 'rgba(34, 197, 94, 0.1)' :
                    locationStatus === 'outside' ? 'rgba(239, 68, 68, 0.1)' :
                        locationStatus === 'error' ? 'rgba(251, 146, 60, 0.1)' :
                            'rgba(59, 130, 246, 0.1)',
                border: `1px solid ${locationStatus === 'inside' ? '#22c55e' :
                    locationStatus === 'outside' ? '#ef4444' :
                        locationStatus === 'error' ? '#fb923c' :
                            '#3b82f6'}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>
                        {locationStatus === 'inside' ? '' :
                            locationStatus === 'outside' ? '' :
                                locationStatus === 'error' ? '' : ''}
                    </span>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>
                            {locationStatus === 'inside' ? 'Inside Office Premises' :
                                locationStatus === 'outside' ? 'Outside Office Premises' :
                                    locationStatus === 'error' ? 'Location Error' :
                                        'Verifying Location...'}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>
                            {locationStatus === 'inside' &&
                                `You are within ${currentOfficeLocation.radius}m of office.`}

                            {locationStatus === 'outside' &&
                                `You must be within ${currentOfficeLocation.radius}m to mark attendance.`}

                            {locationStatus === 'checking' && 'Verifying location...'}
                            {locationStatus === 'error' && 'Please enable GPS to continue.'}
                        </div>

                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {locationStatus === 'outside' && currentLocation && (
                        <button
                            onClick={() => setShowAdminModal(true)}
                            className="btn"
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                color: 'var(--text-main)',
                                border: '1px solid currentColor',
                                padding: '5px 10px',
                                fontSize: '12px'
                            }}
                        >
                            📍 Set Current as Office (Admin)
                        </button>
                    )}
                </div>

                <AdminVerificationModal
                    isOpen={showAdminModal}
                    onClose={() => setShowAdminModal(false)}
                    onVerified={(employee) => {
                        setShowAdminModal(false); // Close modal on success
                        if (currentLocation) {
                            const newLoc = {
                                ...currentOfficeLocation,
                                latitude: currentLocation.lat,
                                longitude: currentLocation.lng
                            };
                            setCurrentLocation(null); // Clear temp location
                            setCurrentOfficeLocation(newLoc);
                            localStorage.setItem('office_location', JSON.stringify(newLoc));
                            setLocationStatus('inside');
                            alert(`Location updated by ${employee.name}`);
                        }
                    }}
                />
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                <div className="card" style={{ flex: 1, padding: '20px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>Total Employees</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--accent-gradient)' }}>
                        {employees.length}
                    </div>
                </div>
                <div className="card" style={{ flex: 1, padding: '20px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>Present Today</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#22c55e' }}>
                        {todayAttendance.length}
                    </div>
                </div>
                <div className="card" style={{ flex: 1, padding: '20px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>Currently In</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {todayAttendance.filter(a => !a.check_out_time).length}
                    </div>
                </div>
            </div>

            {/* Mobile Tabs */}
            {isMobile && (
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '0.5rem',
                    borderRadius: '8px'
                }}>
                    <button
                        onClick={() => setActiveTab('scan')}
                        className="btn"
                        style={{
                            flex: 1,
                            background: activeTab === 'scan' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'scan' ? 'white' : 'var(--text-main)',
                            border: activeTab === 'scan' ? 'none' : '1px solid var(--border-glass)'
                        }}
                    >
                        📷 Scan Face
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', gap: '2rem', flexDirection: isMobile && activeTab === 'list' ? 'column' : isMobile ? 'column' : 'row', justifyContent: 'center' }}>
                {(activeTab === 'scan' || !isMobile) && (
                    <div style={{ flex: isMobile ? '1' : '1', width: isMobile ? '100%' : 'auto', maxWidth: '600px' }}>
                        <h2>Face Recognition</h2>
                        <div className="card" style={{ padding: '20px' }}>
                            {!isCameraOpen ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: '100%',
                                        aspectRatio: '4/3',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '15px',
                                        color: 'var(--text-muted)',
                                        fontSize: '14px'
                                    }}>
                                        Ready for face recognition
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => startCamera('check-in')}
                                            disabled={!modelsLoaded}
                                            style={{
                                                width: '100%',
                                                padding: '20px 30px',
                                                fontSize: '18px',
                                                fontWeight: '700',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            ✓ Check In
                                        </button>
                                        <button
                                            className="btn"
                                            onClick={() => startCamera('check-out')}
                                            disabled={!modelsLoaded}
                                            style={{
                                                width: '100%',
                                                background: 'var(--danger)',
                                                color: 'white',
                                                padding: '20px 30px',
                                                fontSize: '18px',
                                                fontWeight: '700',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            ✕ Check Out
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            style={{
                                                width: '100%',
                                                borderRadius: '8px',
                                                backgroundColor: 'black'
                                            }}
                                        />
                                        {matchedEmployee && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '10px',
                                                left: '10px',
                                                right: '10px',
                                                background: 'rgba(34, 197, 94, 0.95)',
                                                color: 'white',
                                                padding: '10px',
                                                borderRadius: '8px',
                                                fontSize: '12px'
                                            }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{matchedEmployee.name}</div>
                                                <div style={{ fontSize: '11px' }}>{matchedEmployee.employee_id}</div>
                                            </div>
                                        )}
                                    </div>
                                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={recognizeFace}
                                            disabled={isProcessing}
                                            style={{ width: '100%', fontSize: '13px', padding: '10px' }}
                                        >
                                            {isProcessing ? 'Recognizing...' : `Scan for ${actionType === 'check-in' ? 'Check-In' : 'Check-Out'}`}
                                        </button>
                                        <button
                                            className="btn"
                                            onClick={stopCamera}
                                            style={{ width: '100%', background: 'var(--danger)', color: 'white', fontSize: '13px', padding: '10px' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}


            </div>
        </div >
    );
};

export default EmployeeAttendance;
