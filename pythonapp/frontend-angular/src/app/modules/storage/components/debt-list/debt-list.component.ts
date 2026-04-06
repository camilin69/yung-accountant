import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DebtService, Debt } from '../../services/debt.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-debt-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './debt-list.component.html',
  styleUrls: ['./debt-list.component.css']
})
export class DebtListComponent implements OnInit {
  debts: Debt[] = [];
  filteredDebts: Debt[] = [];
  loading = true;
  error = '';
  typeFilter: string = 'all';
  statusFilter: string = 'all';

  constructor(
    private debtService: DebtService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDebts();
  }

  loadDebts(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.debtService.getDebts(user.id, this.typeFilter).subscribe({
        next: (data) => {
          this.debts = data;
          this.filterDebts();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar los registros';
          this.loading = false;
          console.error(err);
        }
      });
    }
  }

  filterDebts(): void {
    this.filteredDebts = this.debts;
    if (this.statusFilter !== 'all') {
      this.filteredDebts = this.filteredDebts.filter(
        d => d.status === this.statusFilter
      );
    }
  }

  onTypeChange(): void {
    this.loadDebts();
  }

  onStatusChange(): void {
    this.filterDebts();
  }

  deleteDebt(id: string): void {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      this.debtService.deleteDebt(id).subscribe({
        next: () => {
          this.loadDebts();
        },
        error: (err) => {
          this.error = 'Error al eliminar el registro';
          console.error(err);
        }
      });
    }
  }

  markAsPaid(debt: Debt): void {
    if (confirm(`¿Marcar ${debt.type === 'debt' ? 'deuda' : 'crédito'} como pagado?`)) {
      this.debtService.updateDebt(debt._id!, { status: 'paid' }).subscribe({
        next: () => {
          this.loadDebts();
        },
        error: (err) => {
          this.error = 'Error al actualizar el estado';
          console.error(err);
        }
      });
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES');
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getTypeLabel(type: string): string {
    return type === 'debt' ? 'Deuda' : 'Crédito';
  }

  getStatusLabel(status: string): string {
    return status === 'paid' ? 'Pagado' : 'Pendiente';
  }
}