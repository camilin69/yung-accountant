// Configuración base de las APIs
const API_CONFIG = {
    auth: 'http://localhost:5001/api',
    goals: 'http://localhost:5002/api',
    savings: 'http://localhost:5003/api',
    purchases: 'http://localhost:5004/api',
    storage: 'http://localhost:5005/api'
};

// Clase base para manejar peticiones HTTP (sin tokens)
class ApiService {
    constructor(service) {
        this.baseUrl = API_CONFIG[service];
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error en la petición');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}