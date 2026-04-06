import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PurchaseService, Purchase } from '../../services/purchase.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './purchase-form.component.html',
  styleUrls: ['./purchase-form.component.css']
})
export class PurchaseFormComponent implements OnInit {
  purchase: Partial<Purchase> = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    category: 'alimentos'
  };
  isEditing = false;
  purchaseId: string | null = null;
  loading = false;
  error = '';
  
  categories = [
    'alimentos',
    'transporte',
    'vivienda',
    'servicios',
    'entretenimiento',
    'salud',
    'educacion',
    'ropa',
    'tecnologia',
    'otros'
  ];

  constructor(
    private purchaseService: PurchaseService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.purchaseId = this.route.snapshot.paramMap.get('id');
    if (this.purchaseId) {
      this.isEditing = true;
      this.loadPurchase();
    }
  }

  loadPurchase(): void {
    const user = this.authService.getCurrentUser();
    if (user && this.purchaseId) {
      this.purchaseService.getPurchases(user.id, 'all', 'all').subscribe({
        next: (data) => {
          const found = data.find(p => p._id === this.purchaseId);
          if (found) {
            this.purchase = {
              ...found,
              date: new Date(found.date).toISOString().split('T')[0]
            };
          } else {
            this.error = 'Compra no encontrada';
          }
        },
        error: (err) => {
          this.error = 'Error al cargar la compra';
          console.error(err);
        }
      });
    }
  }

  onSubmit(): void {
    if (!this.purchase.description || !this.purchase.amount || this.purchase.amount <= 0) {
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

    const purchaseData = {
      ...this.purchase,
      user_id: user.id,
      date: new Date(this.purchase.date!).toISOString()
    };

    if (this.isEditing && this.purchaseId) {
      this.purchaseService.updatePurchase(this.purchaseId, purchaseData).subscribe({
        next: () => {
          this.router.navigate(['/purchases']);
        },
        error: (err) => {
          this.error = 'Error al actualizar la compra';
          this.loading = false;
          console.error(err);
        }
      });
    } else {
      this.purchaseService.createPurchase(purchaseData as Omit<Purchase, '_id' | 'created_at' | 'updated_at'>).subscribe({
        next: () => {
          this.router.navigate(['/purchases']);
        },
        error: (err) => {
          this.error = 'Error al crear la compra';
          this.loading = false;
          console.error(err);
        }
      });
    }
  }

  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      alimentos: 'Alimentos',
      transporte: 'Transporte',
      vivienda: 'Vivienda',
      servicios: 'Servicios',
      entretenimiento: 'Entretenimiento',
      salud: 'Salud',
      educacion: 'Educación',
      ropa: 'Ropa',
      tecnologia: 'Tecnología',
      otros: 'Otros'
    };
    return labels[category] || category;
  }
}