// API client that works in both Electron, Browser, and Capacitor

const isElectron = () => {
    // Method 1: Check for ipcRenderer (most reliable)
    if (typeof window !== 'undefined' && window.ipcRenderer !== undefined) {
        return true;
    }
    // Method 2: Check for file:// protocol (packaged Electron)
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
        return true;
    }
    // Method 3: Check user agent
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')) {
        return true;
    }
    return false;
};

const isCapacitor = () => {
    return typeof window !== 'undefined' &&
        ((window as any).Capacitor !== undefined ||
            // Check for Capacitor user agent or platform
            navigator.userAgent.includes('Capacitor'));
};

const getBaseUrl = () => {
    const PROD_URL = 'https://attendance-app-v5jdla.fly.dev/api';

    // ✅ LOCAL DEV → ALWAYS localhost
    if (import.meta.env.DEV) {
        return 'http://localhost:3001/api';
    }

    // ✅ PROD → allow override (Capacitor / custom)
    const storedUrl = localStorage.getItem('API_URL');
    if (storedUrl) return storedUrl;

    // ✅ PROD → Use Fly.io (works for both Electron and Browser)
    return PROD_URL;
};

// Generic API call function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const baseUrl = getBaseUrl();

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'API request failed' }));
            throw new Error(error.error || 'API request failed');
        }

        return response.json();
    } catch (error: any) {
        // Better error handling for Capacitor
        if (isCapacitor() && error.message === 'Failed to fetch') {
            const currentUrl = getBaseUrl();
            throw new Error(
                `Cannot connect to server at ${currentUrl}.\n\n` +
                `Please:\n` +
                `1. Make sure the server is running on your PC (npm run server)\n` +
                `2. Find your PC's IP address (run 'ipconfig' on Windows)\n` +
                `3. Configure the API URL in the app settings\n` +
                `   Example: api.setBaseUrl('http://192.168.1.100:3001')`
            );
        }
        throw error;
    }
};

// Unified API interface
export const api = {
    // Configuration
    setBaseUrl: (url: string) => {
        // Ensure standard format
        let cleanUrl = url.trim();
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
        if (!cleanUrl.endsWith('/api')) cleanUrl += '/api';

        localStorage.setItem('API_URL', cleanUrl);
    },
    getCurrentBaseUrl: () => getBaseUrl(),

    // Employees
    // Employees
    getEmployees: async () => {
        return apiCall('/employees');
    },

    registerEmployee: async (data: any) => {
        return apiCall('/register-employee', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Attendance
    getAttendance: async () => {
        return apiCall('/attendance');
    },

    markAttendance: async (data: any) => {
        return apiCall('/mark-attendance', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Office Locations
    getOfficeLocations: async () => {
        return apiCall('/office-locations');
    },

    addOfficeLocation: async (data: any) => {
        return apiCall('/add-office-location', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateOfficeLocation: async (data: any) => {
        return apiCall('/update-office-location', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteOfficeLocation: async (id: number) => {
        return apiCall(`/delete-office-location/${id}`, {
            method: 'DELETE',
        });
    },

    // Visitors
    getVisitors: async () => {
        return apiCall('/visitors');
    },

    addVisitor: async (data: any) => {
        return apiCall('/add-visitor', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    checkoutVisitor: async (id: number) => {
        return apiCall(`/checkout-visitor/${id}`, {
            method: 'PUT',
        });
    },

    // Appointments
    getAppointments: async () => {
        return apiCall('/appointments');
    },

    addAppointment: async (data: any) => {
        return apiCall('/add-appointment', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Dashboard Stats
    getDashboardStats: async () => {
        return apiCall('/dashboard-stats');
    },

    // Additional Appointment Methods
    updateAppointmentStatus: async (data: { id: number; status: string }) => {
        return apiCall('/update-appointment-status', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Additional Attendance Methods
    getTodayAttendance: async () => {
        return apiCall('/today-attendance');
    },

    checkInEmployee: async (employeeId: string) => {
        return apiCall('/check-in-employee', {
            method: 'POST',
            body: JSON.stringify({ employeeId }),
        });
    },

    checkOutEmployee: async (employeeId: string) => {
        return apiCall('/check-out-employee', {
            method: 'POST',
            body: JSON.stringify({ employeeId }),
        });
    },

    uploadVoice: async (file: File) => {
        const formData = new FormData();
        formData.append('voice', file);

        const baseUrl = getBaseUrl();
        if (!baseUrl) return { success: false, error: "No API URL" };

        const response = await fetch(`${baseUrl}/upload-voice`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
};

export default api;
