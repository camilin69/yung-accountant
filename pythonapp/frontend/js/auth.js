class AuthService extends ApiService{
    constructor() {
        super('auth');
    }

    init() {
        this.checkAuth();
        this.initEventListeners();
    }

    initEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const response = await this.post('/auth/login', { email, password });
            
            // Guardar solo el usuario en localStorage
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            
            window.location.href = '/pages/dashboard.html';
        } catch (error) {
            alert(error.message || 'Error al iniciar sesión');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        try {
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const userType = document.getElementById('userType').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                alert('Las contraseñas no coinciden');
                return;
            }

            const response = await this.post('/auth/register', {
                name,
                email,
                userType,
                password
            });
            
            // Guardar solo el usuario en localStorage
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            
            alert('Registro exitoso');
            window.location.href = 'dashboard.html';
        } catch (error) {
            alert(error.message || 'Error al registrarse');
        }
    }

    handleLogout(e) {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        window.location.href = '../index.html';
    }

    async checkAuth() {
        const currentUser = this.getCurrentUser();
        const currentPath = window.location.pathname;
        
        // Verificar si el usuario existe en localStorage
        if (currentUser && currentUser.id) {
            try {
                // Verificar que el usuario aún existe en la BD
                const response = await this.get(`/auth/verify?user_id=${currentUser.id}`);
                if (response.valid) {
                    // Actualizar datos del usuario
                    localStorage.setItem('currentUser', JSON.stringify(response.user));
                    
                    // Mostrar nombre del usuario
                    const userNameSpan = document.getElementById('userName');
                    if (userNameSpan) {
                        userNameSpan.textContent = `Hola, ${response.user.name}`;
                    }
                    return response.user;
                } else {
                    this.clearAuth();
                }
            } catch (error) {
                console.error('Error verificando usuario:', error);
                // Si hay error de red, asumimos que el usuario es válido
                const userNameSpan = document.getElementById('userName');
                if (userNameSpan) {
                    userNameSpan.textContent = `Hola, ${currentUser.name}`;
                }
                return currentUser;
            }
        } else if (this.isProtectedPage(currentPath)) {
            window.location.href = 'login.html';
        }
        return null;
    }

    isProtectedPage(path) {
        return path.includes('/pages/') && 
               !path.includes('login.html') && 
               !path.includes('register.html');
    }

    clearAuth() {
        localStorage.removeItem('currentUser');
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    async waitForUser() {
        // Esperar a que el usuario esté disponible
        return new Promise((resolve) => {
            const checkUser = () => {
                const user = this.getCurrentUser();
                if (user && user.id) {
                    resolve(user);
                } else {
                    setTimeout(checkUser, 100);
                }
            };
            checkUser();
        });
    }
}

// Crear instancia global
const authService = new AuthService();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    authService.init();
});