// Servicio de Almacenamiento
class StorageService extends ApiService {
    constructor() {
        super('storage');
        this.currentUser = authService.getCurrentUser();
        this.init();
    }

    init() {
        this.loadStorage();
        this.loadIncomes();
        this.initEventListeners();
    }

    initEventListeners() {
        const incomeForm = document.getElementById('incomeForm');
        if (incomeForm) {
            incomeForm.addEventListener('submit', (e) => this.saveIncome(e));
        }

        const debtForm = document.getElementById('debtForm');
        if (debtForm) {
            debtForm.addEventListener('submit', (e) => this.saveDebt(e));
        }

        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        const projectedIncome = document.getElementById('projectedIncome');
        
        if (startDate) startDate.addEventListener('change', () => this.calculateProjection());
        if (endDate) endDate.addEventListener('change', () => this.calculateProjection());
        if (projectedIncome) projectedIncome.addEventListener('change', () => this.calculateProjection());
    }

    async loadStorage() {
        if (!this.currentUser) return;

        try {
            const debts = await this.get(`/storage/debts?user_id=${this.currentUser.id}`);
            const tbody = document.getElementById('storageList');
            
            if (tbody) {
                this.renderDebtsTable(tbody, debts);
            }

            await this.loadStats();
        } catch (error) {
            console.error('Error cargando deudas:', error);
        }
    }

    async loadIncomes() {
        if (!this.currentUser) return;

        try {
            const incomes = await this.get(`/storage/incomes?user_id=${this.currentUser.id}`);
            const tbody = document.getElementById('incomeList');
            
            if (tbody) {
                this.renderIncomesTable(tbody, incomes);
            }
        } catch (error) {
            console.error('Error cargando ingresos:', error);
        }
    }

    async loadStats() {
        if (!this.currentUser) return;

        try {
            const stats = await this.get(`/storage/user/${this.currentUser.id}/stats`);
            
            const currentBalanceSpan = document.getElementById('currentBalance');
            if (currentBalanceSpan) {
                currentBalanceSpan.textContent = `$${stats.current_balance.toFixed(2)}`;
            }

            const totalDebtsSpan = document.getElementById('totalDebts');
            if (totalDebtsSpan) {
                totalDebtsSpan.textContent = `$${stats.total_debts.toFixed(2)}`;
            }

            const totalCreditsSpan = document.getElementById('totalCredits');
            if (totalCreditsSpan) {
                totalCreditsSpan.textContent = `$${stats.total_credits.toFixed(2)}`;
            }

            const monthlyIncomeSpan = document.getElementById('monthlyIncome');
            if (monthlyIncomeSpan) {
                monthlyIncomeSpan.textContent = `$${stats.monthly_income.toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    renderDebtsTable(tbody, debts) {
        tbody.innerHTML = '';
        debts.forEach(debt => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="badge ${debt.type === 'debt' ? 'badge-danger' : 'badge-success'}">${debt.type === 'debt' ? 'Deuda' : 'Crédito'}</span></td>
                <td>${debt.concept}</td>
                <td>$${debt.amount.toFixed(2)}</td>
                <td>${new Date(debt.date).toLocaleDateString()}</td>
                <td>${debt.due_date ? new Date(debt.due_date).toLocaleDateString() : '-'}</td>
                <td><span class="badge badge-${debt.status}">${this.getStatusLabel(debt.status)}</span></td>
                <td>
                    <button onclick="storageService.editDebt('${debt._id}')" class="btn btn-primary">Editar</button>
                    <button onclick="storageService.deleteDebt('${debt._id}')" class="btn btn-danger">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderIncomesTable(tbody, incomes) {
        tbody.innerHTML = '';
        incomes.forEach(income => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(income.date).toLocaleDateString()}</td>
                <td>${income.source}</td>
                <td>$${income.amount.toFixed(2)}</td>
                <td>${this.getPeriodLabel(income.period)}</td>
                <td>
                    <button onclick="storageService.editIncome('${income._id}')" class="btn btn-primary">Editar</button>
                    <button onclick="storageService.deleteIncome('${income._id}')" class="btn btn-danger">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async saveDebt(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            alert('Debes iniciar sesión');
            return;
        }

        try {
            const debtId = document.getElementById('debtId').value;
            const debtData = {
                user_id: this.currentUser.id,
                type: document.getElementById('debtType').value,
                concept: document.getElementById('debtConcept').value,
                amount: parseFloat(document.getElementById('debtAmount').value),
                date: new Date(document.getElementById('debtDate').value).toISOString(),
                due_date: document.getElementById('debtDueDate').value ? 
                    new Date(document.getElementById('debtDueDate').value).toISOString() : null,
                status: document.getElementById('debtStatus').value
            };

            if (debtId) {
                await this.put(`/storage/debts/${debtId}`, debtData);
            } else {
                await this.post('/storage/debts', debtData);
            }

            await this.loadStorage();
            closeDebtModal();
        } catch (error) {
            alert(error.message || 'Error al guardar el registro');
        }
    }

    async saveIncome(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            alert('Debes iniciar sesión');
            return;
        }

        try {
            const incomeData = {
                user_id: this.currentUser.id,
                date: new Date(document.getElementById('incomeDate').value).toISOString(),
                source: document.getElementById('incomeSource').value,
                amount: parseFloat(document.getElementById('incomeAmount').value),
                period: document.getElementById('incomePeriod').value
            };

            await this.post('/storage/incomes', incomeData);
            await this.loadIncomes();
            await this.loadStorage();
            closeIncomeModal();
        } catch (error) {
            alert(error.message || 'Error al guardar el ingreso');
        }
    }

    async deleteDebt(id) {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;

        try {
            await this.delete(`/storage/debts/${id}`);
            await this.loadStorage();
        } catch (error) {
            alert(error.message || 'Error al eliminar el registro');
        }
    }

    async deleteIncome(id) {
        if (!confirm('¿Estás seguro de eliminar este ingreso?')) return;

        try {
            await this.delete(`/storage/incomes/${id}`);
            await this.loadIncomes();
            await this.loadStorage();
        } catch (error) {
            alert(error.message || 'Error al eliminar el ingreso');
        }
    }

    async editDebt(id) {
        try {
            const debt = await this.get(`/storage/debts/${id}`);
            
            document.getElementById('debtId').value = debt._id;
            document.getElementById('debtType').value = debt.type;
            document.getElementById('debtConcept').value = debt.concept;
            document.getElementById('debtAmount').value = debt.amount;
            document.getElementById('debtDate').value = debt.date.split('T')[0];
            document.getElementById('debtDueDate').value = debt.due_date ? debt.due_date.split('T')[0] : '';
            document.getElementById('debtStatus').value = debt.status;
            
            openDebtModal();
        } catch (error) {
            alert(error.message || 'Error al cargar el registro');
        }
    }

    async calculateProjection() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const projectedIncome = parseFloat(document.getElementById('projectedIncome').value) || 0;

        if (!startDate || !endDate) {
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            document.getElementById('projectionResult').innerHTML = 'La fecha de inicio debe ser anterior a la fecha fin';
            return;
        }

        try {
            const projection = await this.post(`/storage/user/${this.currentUser.id}/projection`, {
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(endDate).toISOString(),
                projected_monthly_income: projectedIncome
            });

            const resultHTML = `
                <h4>Proyección de Flujo</h4>
                <p>Período: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
                <p>Meses: ${projection.months}</p>
                <p>Balance Actual: $${projection.current_balance.toFixed(2)}</p>
                <p>Ingresos Proyectados: $${projection.projected_income.toFixed(2)}</p>
                <p><strong>Balance Proyectado: $${projection.final_balance.toFixed(2)}</strong></p>
            `;

            document.getElementById('projectionResult').innerHTML = resultHTML;
        } catch (error) {
            alert(error.message || 'Error al calcular proyección');
        }
    }

    getStatusLabel(status) {
        const labels = {
            pending: 'Pendiente',
            partial: 'Parcial',
            paid: 'Pagado'
        };
        return labels[status] || status;
    }

    getPeriodLabel(period) {
        const labels = {
            daily: 'Diario',
            weekly: 'Semanal',
            monthly: 'Mensual',
            yearly: 'Anual',
            unique: 'Único'
        };
        return labels[period] || period;
    }
}

// Funciones globales
let storageService;

function openIncomeModal() {
    document.getElementById('incomeModal').style.display = 'block';
    document.getElementById('incomeForm').reset();
}

function closeIncomeModal() {
    document.getElementById('incomeModal').style.display = 'none';
}

function openDebtModal() {
    document.getElementById('debtModal').style.display = 'block';
    document.getElementById('debtForm').reset();
    document.getElementById('debtId').value = '';
}

function closeDebtModal() {
    document.getElementById('debtModal').style.display = 'none';
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('storageList') || document.getElementById('incomeList')) {
        storageService = new StorageService();
    }
});