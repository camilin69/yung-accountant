class GoalsService extends ApiService {
    constructor() {
        super('goals');
        this.currentUser = authService.getCurrentUser();
        this.init();
    }

    init() {
        this.loadGoals();
        this.initEventListeners();
    }

    initEventListeners() {
        const goalForm = document.getElementById('goalForm');
        if (goalForm) {
            goalForm.addEventListener('submit', (e) => this.saveGoal(e));
        }
    }

    async loadGoals() {
        if (!this.currentUser) return;

        try {
            const goals = await this.get(`/goals?user_id=${this.currentUser.id}`);
            const tbody = document.getElementById('goalsList');
            const recentGoalsList = document.getElementById('recentGoalsList');
            
            if (tbody) {
                this.renderGoalsTable(tbody, goals);
            }

            if (recentGoalsList) {
                this.renderRecentGoals(recentGoalsList, goals.slice(-3));
            }

            await this.loadStats();
        } catch (error) {
            console.error('Error cargando metas:', error);
            alert('Error al cargar las metas');
        }
    }

    renderGoalsTable(tbody, goals) {
        tbody.innerHTML = '';
        goals.forEach(goal => {
            const progress = (goal.current_amount / goal.target_amount * 100).toFixed(1);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${goal.title}</td>
                <td>${goal.description}</td>
                <td>$${goal.target_amount}</td>
                <td>$${goal.current_amount}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <small>${progress}%</small>
                </td>
                <td>${new Date(goal.start_date).toLocaleDateString()}</td>
                <td>${new Date(goal.end_date).toLocaleDateString()}</td>
                <td>
                    <button onclick="goalsService.editGoal('${goal._id}')" class="btn btn-primary">Editar</button>
                    <button onclick="goalsService.deleteGoal('${goal._id}')" class="btn btn-danger">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderRecentGoals(tbody, goals) {
        tbody.innerHTML = '';
        goals.forEach(goal => {
            const progress = (goal.current_amount / goal.target_amount * 100).toFixed(1);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${goal.title}</td>
                <td>$${goal.target_amount}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <small>${progress}%</small>
                </td>
                <td>${new Date(goal.end_date).toLocaleDateString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadStats() {
        if (!this.currentUser) return;

        try {
            const stats = await this.get(`/goals/user/${this.currentUser.id}/stats`);
            
            const activeGoalsSpan = document.getElementById('activeGoals');
            if (activeGoalsSpan) {
                activeGoalsSpan.textContent = stats.active_goals;
            }

            const totalSavingsSpan = document.getElementById('totalSavings');
            if (totalSavingsSpan) {
                totalSavingsSpan.textContent = `$${stats.total_current.toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    async saveGoal(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            alert('Debes iniciar sesión');
            return;
        }

        try {
            const goalId = document.getElementById('goalId').value;
            const goalData = {
                user_id: this.currentUser.id,
                title: document.getElementById('goalTitle').value,
                description: document.getElementById('goalDescription').value,
                target_amount: parseFloat(document.getElementById('goalTarget').value),
                current_amount: parseFloat(document.getElementById('goalCurrent').value),
                start_date: new Date(document.getElementById('goalStartDate').value).toISOString(),
                end_date: new Date(document.getElementById('goalEndDate').value).toISOString()
            };

            if (goalId) {
                await this.put(`/goals/${goalId}`, goalData);
            } else {
                await this.post('/goals', goalData);
            }

            await this.loadGoals();
            closeGoalModal();
        } catch (error) {
            alert(error.message || 'Error al guardar la meta');
        }
    }

    async deleteGoal(id) {
        if (!confirm('¿Estás seguro de eliminar esta meta?')) return;

        try {
            await this.delete(`/goals/${id}`);
            await this.loadGoals();
        } catch (error) {
            alert(error.message || 'Error al eliminar la meta');
        }
    }

    async editGoal(id) {
        try {
            const goal = await this.get(`/goals/${id}`);
            
            document.getElementById('goalId').value = goal._id;
            document.getElementById('goalTitle').value = goal.title;
            document.getElementById('goalDescription').value = goal.description;
            document.getElementById('goalTarget').value = goal.target_amount;
            document.getElementById('goalCurrent').value = goal.current_amount;
            document.getElementById('goalStartDate').value = goal.start_date.split('T')[0];
            document.getElementById('goalEndDate').value = goal.end_date.split('T')[0];
            
            document.getElementById('modalTitle').textContent = 'Editar Meta';
            openGoalModal();
        } catch (error) {
            alert(error.message || 'Error al cargar la meta');
        }
    }
}

// Funciones globales
let goalsService;

function openGoalModal() {
    document.getElementById('goalModal').style.display = 'block';
    document.getElementById('modalTitle').textContent = 'Nueva Meta';
    document.getElementById('goalForm').reset();
    document.getElementById('goalId').value = '';
}

function closeGoalModal() {
    document.getElementById('goalModal').style.display = 'none';
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('goalsList') || document.getElementById('recentGoalsList')) {
        goalsService = new GoalsService();
    }
});