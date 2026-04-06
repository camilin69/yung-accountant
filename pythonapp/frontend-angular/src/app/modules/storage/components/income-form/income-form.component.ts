import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IncomeService, Income } from '../../services/income.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './income-form.component.html',
  styleUrls: ['./income-form.component.css']
})
export class IncomeFormComponent implements OnInit {
  income: Partial<Income> = {
    date: new Date().toISOString().split('T')[0],
    source: '',
    amount: 0,
    period: 'monthly'
  };
  isEditing = false;
  incomeId: string | null = null;
  loading = false;
  error = '';

  periods = [
    { value: 'monthly', label: 'Mensual' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'annual', label: 'Anual' },
    { value: 'one-time', label: 'Único' }
  ];

  constructor(
    private incomeService: IncomeService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.incomeId = this.route.snapshot.paramMap.get('id');
    if (this.incomeId) {
      this.isEditing = true;
      this.loadIncome();
    }
  }

  loadIncome(): void {
    const user = this.authService.getCurrentUser();
    if (user && this.incomeId) {
      this.incomeService.getIncomes(user.id).subscribe({
        next: (data) => {
          const found = data.find(i => i._id === this.incomeId);
          if (found) {
            this.income = {
              ...found,
              date: new Date(found.date).toISOString().split('T')[0]
            };
          } else {
            this.error = 'Ingreso no encontrado';
          }
        },
        error: (err) => {
          this.error = 'Error al cargar el ingreso';
          console.error(err);
        }
      });
    }
  }

  onSubmit(): void {
    if (!this.income.source || !this.income.amount || this.income.amount <= 0) {
      this.error = 'Por favor completa todos los campos requeridos correctamente';
      return;
    }

    this.loading = true;
    this.error = '';

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.error = 'Usuario no autenticado';
      this.loading = false;
      return;
    }

    const incomeData = {
      ...this.income,
      user_id: user.id,
      date: new Date(this.income.date!).toISOString()
    };

    if (this.isEditing && this.incomeId) {
      this.incomeService.updateIncome(this.incomeId, incomeData).subscribe({
        next: () => {
          this.router.navigate(['/storage/incomes']);
        },
        error: (err) => {
          this.error = 'Error al actualizar el ingreso';
          this.loading = false;
          console.error(err);
        }
      });
    } else {
      this.incomeService.createIncome(incomeData as Omit<Income, '_id' | 'created_at' | 'updated_at'>).subscribe({
        next: () => {
          this.router.navigate(['/storage/incomes']);
        },
        error: (err) => {
          this.error = 'Error al crear el ingreso';
          this.loading = false;
          console.error(err);
        }
      });
    }
  }
}