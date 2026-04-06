import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SavingService, Saving } from '../../services/saving.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-saving-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './saving-form.component.html',
  styleUrls: ['./saving-form.component.css']
})
export class SavingFormComponent implements OnInit {
  saving: Partial<Saving> = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    category: 'otros'
  };
  isEditing = false;
  savingId: string | null = null;
  loading = false;
  error = '';
  
  categories = [
    'ahorro_regular',
    'fondo_emergencia',
    'inversiones',
    'viajes',
    'educacion',
    'salud',
    'otros'
  ];

  constructor(
    private savingService: SavingService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.savingId = this.route.snapshot.paramMap.get('id');
    if (this.savingId) {
      this.isEditing = true;
      this.loadSaving();
    }
  }

  loadSaving(): void {
    // Nota: El endpoint para obtener un solo ahorro no está implementado en el backend
    // Por ahora, cargamos todos y filtramos
    const user = this.authService.getCurrentUser();
    if (user && this.savingId) {
      this.savingService.getSavings(user.id, 'all').subscribe({
        next: (data) => {
          const found = data.find(s => s._id === this.savingId);
          if (found) {
            this.saving = {
              ...found,
              date: new Date(found.date).toISOString().split('T')[0]
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
    if (!this.saving.description || !this.saving.amount || this.saving.amount <= 0) {
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

    const savingData = {
      ...this.saving,
      user_id: user.id,
      date: new Date(this.saving.date!).toISOString()
    };

    if (this.isEditing && this.savingId) {
      this.savingService.updateSaving(this.savingId, savingData).subscribe({
        next: () => {
          this.router.navigate(['/savings']);
        },
        error: (err) => {
          this.error = 'Error al actualizar el registro';
          this.loading = false;
          console.error(err);
        }
      });
    } else {
      this.savingService.createSaving(savingData as Omit<Saving, '_id' | 'created_at' | 'updated_at'>).subscribe({
        next: () => {
          this.router.navigate(['/savings']);
        },
        error: (err) => {
          this.error = 'Error al crear el registro';
          this.loading = false;
          console.error(err);
        }
      });
    }
  }

  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      ahorro_regular: 'Ahorro Regular',
      fondo_emergencia: 'Fondo de Emergencia',
      inversiones: 'Inversiones',
      viajes: 'Viajes',
      educacion: 'Educación',
      salud: 'Salud',
      otros: 'Otros'
    };
    return labels[category] || category;
  }
}