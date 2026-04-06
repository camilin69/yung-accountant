// Servicio de Compras
class PurchasesService extends ApiService {
    constructor() {
        super('purchases');
        this.currentUser = authService.getCurrentUser();
        this.init();
    }

    init() {
        this.loadPurchases();
        this.initEventListeners();
    }

    initEventListeners() {
        const purchaseForm = document.getElementById('purchaseForm');
        if (purchaseForm) {
            purchaseForm.addEventListener('submit', (e) => this.savePurchase(e));
        }

        const timeRange = document.getElementById('timeRange');
        if (timeRange) {
            timeRange.addEventListener('change', () => this.filterPurchases());
        }

        const category = document.getElementById('category');
        if (category) {
            category.addEventListener('change', () => this.filterPurchases());
        }
    }

    async loadPurchases(timeRange = 'all', category = 'all') {
        if (!this.currentUser) return;

        try {
            const purchases = await this.get(
                `/purchases?user_id=${this.currentUser.id}&range=${timeRange}&category=${category}`
            );
            
            const tbody = document.getElementById('purchasesList');
            const recentPurchasesList = document.getElementById('recentPurchasesList');
            
            if (tbody) {
                this.renderPurchasesTable(tbody, purchases);
            }

            if (recentPurchasesList) {
                this.renderRecentPurchases(recentPurchasesList, purchases.slice(-5));
            }

            await this.loadStats();
        } catch (error) {
            console.error('Error cargando compras:', error);
            alert('Error al cargar las compras');
        }
    }

    renderPurchasesTable(tbody, purchases) {
        tbody.innerHTML = '';
        purchases.forEach(purchase => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(purchase.date).toLocaleDateString()}</td>
                <td>${purchase.description}</td>
                <td>$${purchase.amount.toFixed(2)}</td>
                <td>${this.getCategoryLabel(purchase.category)}</td>
                <td>
                    <button onclick="purchasesService.editPurchase('${purchase._id}')" class="btn btn-primary">Editar</button>
                    <button onclick="purchasesService.deletePurchase('${purchase._id}')" class="btn btn-danger">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderRecentPurchases(tbody, purchases) {
        tbody.innerHTML = '';
        purchases.forEach(purchase => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(purchase.date).toLocaleDateString()}</td>
                <td>${purchase.description}</td>
                <td>$${purchase.amount.toFixed(2)}</td>
                <td>${this.getCategoryLabel(purchase.category)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadStats() {
        if (!this.currentUser) return;

        try {
            const stats = await this.get(`/purchases/user/${this.currentUser.id}/stats`);
            
            const totalExpensesSpan = document.getElementById('totalExpenses');
            if (totalExpensesSpan) {
                totalExpensesSpan.textContent = `$${stats.total.toFixed(2)}`;
            }

            const avgExpenseSpan = document.getElementById('avgExpense');
            if (avgExpenseSpan) {
                avgExpenseSpan.textContent = `$${stats.average.toFixed(2)}`;
            }

            const maxExpenseSpan = document.getElementById('maxExpense');
            if (maxExpenseSpan) {
                maxExpenseSpan.textContent = `$${stats.max.toFixed(2)}`;
            }

            const monthlyExpensesSpan = document.getElementById('monthlyExpenses');
            if (monthlyExpensesSpan && stats.recent && stats.recent.length > 0) {
                const monthlyTotal = stats.recent
                    .filter(p => new Date(p.date).getMonth() === new Date().getMonth())
                    .reduce((sum, p) => sum + p.amount, 0);
                monthlyExpensesSpan.textContent = `$${monthlyTotal.toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    getCategoryLabel(category) {
        const labels = {
            food: 'Alimentación',
            transport: 'Transporte',
            entertainment: 'Entretenimiento',
            education: 'Educación',
            health: 'Salud',
            other: 'Otros'
        };
        return labels[category] || category;
    }

    async savePurchase(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            alert('Debes iniciar sesión');
            return;
        }

        try {
            const purchaseId = document.getElementById('purchaseId').value;
            const purchaseData = {
                user_id: this.currentUser.id,
                date: new Date(document.getElementById('purchaseDate').value).toISOString(),
                description: document.getElementById('purchaseDescription').value,
                amount: parseFloat(document.getElementById('purchaseAmount').value),
                category: document.getElementById('purchaseCategory').value
            };

            if (purchaseId) {
                await this.put(`/purchases/${purchaseId}`, purchaseData);
            } else {
                await this.post('/purchases', purchaseData);
            }

            await this.loadPurchases(
                document.getElementById('timeRange')?.value || 'all',
                document.getElementById('category')?.value || 'all'
            );
            closePurchaseModal();
        } catch (error) {
            alert(error.message || 'Error al guardar la compra');
        }
    }

    async deletePurchase(id) {
        if (!confirm('¿Estás seguro de eliminar esta compra?')) return;

        try {
            await this.delete(`/purchases/${id}`);
            await this.loadPurchases(
                document.getElementById('timeRange')?.value || 'all',
                document.getElementById('category')?.value || 'all'
            );
        } catch (error) {
            alert(error.message || 'Error al eliminar la compra');
        }
    }

    async editPurchase(id) {
        try {
            const purchase = await this.get(`/purchases/${id}`);
            
            document.getElementById('purchaseId').value = purchase._id;
            document.getElementById('purchaseDate').value = purchase.date.split('T')[0];
            document.getElementById('purchaseDescription').value = purchase.description;
            document.getElementById('purchaseAmount').value = purchase.amount;
            document.getElementById('purchaseCategory').value = purchase.category;
            
            openPurchaseModal();
        } catch (error) {
            alert(error.message || 'Error al cargar la compra');
        }
    }

    async filterPurchases() {
        const timeRange = document.getElementById('timeRange').value;
        const category = document.getElementById('category').value;
        await this.loadPurchases(timeRange, category);
    }
}

// Funciones globales
let purchasesService;

function openPurchaseModal() {
    document.getElementById('purchaseModal').style.display = 'block';
    document.getElementById('purchaseForm').reset();
    document.getElementById('purchaseId').value = '';
}

function closePurchaseModal() {
    document.getElementById('purchaseModal').style.display = 'none';
}

function filterPurchases() {
    if (purchasesService) {
        purchasesService.filterPurchases();
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('purchasesList') || document.getElementById('recentPurchasesList')) {
        purchasesService = new PurchasesService();
    }
});