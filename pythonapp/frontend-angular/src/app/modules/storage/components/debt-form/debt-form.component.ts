import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DebtService, Debt } from '../../services/debt.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-debt-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './debt-form.component.html',
  styleUrls: ['./debt-form.component.css']
})
export class DebtFormComponent implements OnInit {
  debt: Partial<Debt> = {
    type: 'debt',
    concept: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'pending'
  };
  isEditing = false;
  debtId: string | null = null;
  loading = false;
  error = '';

  constructor(
    private debtService: DebtService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.debtId = this.route.snapshot.paramMap.get('id');
    if (this.debtId) {
      this.isEditing = true;
      this.loadDebt();
    }
  }

  loadDebt(): void {
    const user = this.authService.getCurrentUser();
    if (user && this.debtId) {
      this.debtService.getDebts(user.id, 'all').subscribe({
        next: (data) => {
          const found = data.find(d => d._id === this.debtId);
          if (found) {
            this.debt = {
              ...found,
              date: new Date(found.date).toISOString().split('T')[0],
              due_date: found.due_date ? new Date(found.due_date).toISOString().split('T')[0] : ''
            };
          } else {
            this.error = 'Registro no encontrado';
          }
        },
        error: (err) => {
          this.error = 'Error al cargar el registro';
          console.error(err);
        }
      });
    }
  }

  onSubmit(): void {
    if (!this.debt.concept || !this.debt.amount || this.debt.amount <= 0) {
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

    // Preparar los datos para enviar
    const debtData: any = {
      user_id: user.id,
      type: this.debt.type,
      concept: this.debt.concept,
      amount: this.debt.amount,
      date: new Date(this.debt.date!).toISOString(),
      status: this.debt.status
    };

    // Solo agregar due_date si tiene valor
    if (this.debt.due_date && this.debt.due_date.trim() !== '') {
      debtData.due_date = new Date(this.debt.due_date).toISOString();
    }

    if (this.isEditing && this.debtId) {
      this.debtService.updateDebt(this.debtId, debtData).subscribe({
        next: () => {
          this.router.navigate(['/storage/debts']);
        },
        error: (err) => {
          this.error = 'Error al actualizar el registro';
          this.loading = false;
          console.error(err);
        }
      });
    } else {
      this.debtService.createDebt(debtData).subscribe({
        next: () => {
          this.router.navigate(['/storage/debts']);
        },
        error: (err) => {
          this.error = 'Error al crear el registro';
          this.loading = false;
          console.error(err);
        }
      });
    }
  }
}