import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IncomeService, Income } from '../../services/income.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-income-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './income-list.component.html',
  styleUrls: ['./income-list.component.css']
})
export class IncomeListComponent implements OnInit {
  incomes: Income[] = [];
  loading = true;
  error = '';

  constructor(
    private incomeService: IncomeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadIncomes();
  }

  loadIncomes(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.incomeService.getIncomes(user.id).subscribe({
        next: (data) => {
          this.incomes = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar los ingresos';
          this.loading = false;
          console.error(err);
        }
      });
    }
  }

  deleteIncome(id: string): void {
    if (confirm('¿Estás seguro de eliminar este ingreso?')) {
      this.incomeService.deleteIncome(id).subscribe({
        next: () => {
          this.loadIncomes();
        },
        error: (err) => {
          this.error = 'Error al eliminar el ingreso';
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

  getPeriodLabel(period: string): string {
    const labels: { [key: string]: string } = {
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      annual: 'Anual',
      'one-time': 'Único'
    };
    return labels[period] || period;
  }
}