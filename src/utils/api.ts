// API client that works in both Electron, Browser, and Capacitor

const isElectron = () => {
    return typeof window !== 'undefined' && window.ipcRenderer !== undefined;
};

const isCapacitor = () => {
    return typeof window !== 'undefined' &&
        (window.Capacitor !== undefined ||
            (window as any).Capacitor !== undefined ||
            // Check for Capacitor user agent or platform
            navigator.userAgent.includes('Capacitor'));
};

const getBaseUrl = () => {
    // Check if API URL is configured (allows override)
    const storedUrl = localStorage.getItem('API_URL');
    if (storedUrl) {
        return storedUrl;
    }

    // For Capacitor mobile apps, use Fly.io cloud server
    if (isCapacitor()) {
        // Production Fly.io URL - works automatically!
        return 'https://attendance-app-he-mtg.fly.dev/api';
    }

    // For Electron desktop, use IPC (local database)
    if (isElectron()) {
        return null; // Will use IPC instead
    }

    // For browser development, use localhost
    return 'http://localhost:3000/api';
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
                `   Example: api.setBaseUrl('http://192.168.1.100:3000')`
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
        if (isElectron()) {
            return window.ipcRenderer.invoke('get-employees');
        }
        return apiCall('/employees');
    },

    registerEmployee: async (data: any) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('register-employee', data);
        }
        return apiCall('/register-employee', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Attendance
    getAttendance: async () => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('get-attendance');
        }
        return apiCall('/attendance');
    },

    markAttendance: async (data: any) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('mark-attendance', data);
        }
        return apiCall('/mark-attendance', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Office Locations
    getOfficeLocations: async () => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('get-office-locations');
        }
        return apiCall('/office-locations');
    },

    addOfficeLocation: async (data: any) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('add-office-location', data);
        }
        return apiCall('/add-office-location', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateOfficeLocation: async (data: any) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('update-office-location', data);
        }
        return apiCall('/update-office-location', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteOfficeLocation: async (id: number) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('delete-office-location', id);
        }
        return apiCall(`/delete-office-location/${id}`, {
            method: 'DELETE',
        });
    },

    // Visitors
    getVisitors: async () => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('get-visitors');
        }
        return apiCall('/visitors');
    },

    addVisitor: async (data: any) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('add-visitor', data);
        }
        return apiCall('/add-visitor', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    checkoutVisitor: async (id: number) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('checkout-visitor', id);
        }
        return apiCall(`/checkout-visitor/${id}`, {
            method: 'PUT',
        });
    },

    // Appointments
    getAppointments: async () => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('get-appointments');
        }
        return apiCall('/appointments');
    },

    addAppointment: async (data: any) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('add-appointment', data);
        }
        return apiCall('/add-appointment', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Dashboard Stats
    getDashboardStats: async () => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('get-dashboard-stats');
        }
        return apiCall('/dashboard-stats');
    },

    // Additional Appointment Methods
    updateAppointmentStatus: async (data: { id: number; status: string }) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('update-appointment-status', data);
        }
        return apiCall('/update-appointment-status', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Additional Attendance Methods
    getTodayAttendance: async () => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('get-today-attendance');
        }
        return apiCall('/today-attendance');
    },

    checkInEmployee: async (employeeId: string) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('check-in-employee', employeeId);
        }
        return apiCall('/check-in-employee', {
            method: 'POST',
            body: JSON.stringify({ employeeId }),
        });
    },

    checkOutEmployee: async (employeeId: string) => {
        if (isElectron()) {
            return window.ipcRenderer.invoke('check-out-employee', employeeId);
        }
        return apiCall('/check-out-employee', {
            method: 'POST',
            body: JSON.stringify({ employeeId }),
        });
    },
};

export default api;
