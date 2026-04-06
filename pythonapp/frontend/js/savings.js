class SavingsService extends ApiService {
    constructor() {
        super('savings');
        this.currentUser = authService.getCurrentUser();
        this.init();
    }

    init() {
        this.loadSavings();
        this.initEventListeners();
    }

    initEventListeners() {
        const savingForm = document.getElementById('savingForm');
        if (savingForm) {
            savingForm.addEventListener('submit', (e) => this.saveSaving(e));
        }

        const timeRange = document.getElementById('timeRange');
        if (timeRange) {
            timeRange.addEventListener('change', () => this.filterSavings());
        }
    }

    async loadSavings(timeRange = 'all') {
        if (!this.currentUser) return;

        try {
            const savings = await this.get(`/savings?user_id=${this.currentUser.id}&range=${timeRange}`);
            const tbody = document.getElementById('savingsList');
            
            if (tbody) {
                this.renderSavingsTable(tbody, savings);
            }

            await this.loadStats();
        } catch (error) {
            console.error('Error cargando ahorros:', error);
            alert('Error al cargar los ahorros');
        }
    }

    renderSavingsTable(tbody, savings) {
        tbody.innerHTML = '';
        savings.forEach(saving => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(saving.date).toLocaleDateString()}</td>
                <td>${saving.description}</td>
                <td>$${saving.amount.toFixed(2)}</td>
                <td>${this.getCategoryLabel(saving.category)}</td>
                <td>
                    <button onclick="savingsService.editSaving('${saving._id}')" class="btn btn-primary">Editar</button>
                    <button onclick="savingsService.deleteSaving('${saving._id}')" class="btn btn-danger">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadStats() {
        if (!this.currentUser) return;

        try {
            const stats = await this.get(`/savings/user/${this.currentUser.id}/stats`);
            
            const totalSavingsSpan = document.getElementById('totalSavings');
            if (totalSavingsSpan) {
                totalSavingsSpan.textContent = `$${stats.total.toFixed(2)}`;
            }

            const monthlySavingsSpan = document.getElementById('monthlySavings');
            if (monthlySavingsSpan) {
                monthlySavingsSpan.textContent = `$${stats.monthly_total.toFixed(2)}`;
            }

            const yearlyProjectionSpan = document.getElementById('yearlyProjection');
            if (yearlyProjectionSpan) {
                yearlyProjectionSpan.textContent = `$${stats.yearly_projection.toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    getCategoryLabel(category) {
        const labels = {
            emergency: 'Fondo de Emergencia',
            goal: 'Meta Específica',
            investment: 'Inversión',
            other: 'Otro'
        };
        return labels[category] || category;
    }

    async saveSaving(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            alert('Debes iniciar sesión');
            return;
        }

        try {
            const savingId = document.getElementById('savingId').value;
            const savingData = {
                user_id: this.currentUser.id,
                date: new Date(document.getElementById('savingDate').value).toISOString(),
                description: document.getElementById('savingDescription').value,
                amount: parseFloat(document.getElementById('savingAmount').value),
                category: document.getElementById('savingCategory').value
            };

            if (savingId) {
                await this.put(`/savings/${savingId}`, savingData);
            } else {
                await this.post('/savings', savingData);
            }

            await this.loadSavings(document.getElementById('timeRange')?.value || 'all');
            closeSavingModal();
        } catch (error) {
            alert(error.message || 'Error al guardar el ahorro');
        }
    }

    async deleteSaving(id) {
        if (!confirm('¿Estás seguro de eliminar este registro de ahorro?')) return;

        try {
            await this.delete(`/savings/${id}`);
            await this.loadSavings(document.getElementById('timeRange')?.value || 'all');
        } catch (error) {
            alert(error.message || 'Error al eliminar el ahorro');
        }
    }

    async editSaving(id) {
        try {
            const saving = await this.get(`/savings/${id}`);
            
            document.getElementById('savingId').value = saving._id;
            document.getElementById('savingDate').value = saving.date.split('T')[0];
            document.getElementById('savingDescription').value = saving.description;
            document.getElementById('savingAmount').value = saving.amount;
            document.getElementById('savingCategory').value = saving.category;
            
            openSavingModal();
        } catch (error) {
            alert(error.message || 'Error al cargar el ahorro');
        }
    }

    async filterSavings() {
        const timeRange = document.getElementById('timeRange').value;
        await this.loadSavings(timeRange);
    }
}

// Funciones globales
let savingsService;

function openSavingModal() {
    document.getElementById('savingModal').style.display = 'block';
    document.getElementById('savingForm').reset();
    document.getElementById('savingId').value = '';
}

function closeSavingModal() {
    document.getElementById('savingModal').style.display = 'none';
}

function filterSavings() {
    if (savingsService) {
        savingsService.filterSavings();
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('savingsList')) {
        savingsService = new SavingsService();
    }
});