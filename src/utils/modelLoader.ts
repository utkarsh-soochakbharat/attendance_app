/**
 * Utility to get the correct MODEL_URL for face-api.js based on the environment
 * - Browser / Vite dev: /models (served from public/)
 * - Electron dev: /models (Vite public/)
 * - Production (Electron/Browser): https://attendance-app-v5jdla.fly.dev/models (Fly.io)
 */
export const getModelUrl = (): string => {
    // ✅ LOCAL DEV → Use relative path (served from public/)
    if (import.meta.env.DEV) {
        return '/models';
    }
    
    // ✅ PROD → Use Fly.io models
    return 'https://attendance-app-v5jdla.fly.dev/models';
};

/**
 * Wait for the backend server to be ready (for packaged Electron apps)
 * Note: In production, we use Fly.io, so this is mainly for dev mode
 */
export const waitForServer = async (maxRetries = 10, delay = 1000): Promise<boolean> => {
    const modelUrl = getModelUrl();
    // Only wait if we're using localhost (dev mode)
    if (!modelUrl.startsWith('http://localhost')) {
        return true; // Fly.io or relative path - no waiting needed
    }

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch('http://localhost:3001/api/health');
            if (response.ok) {
                return true;
            }
        } catch (error) {
            // Server not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    return false; // Server never became ready
};

