import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PurchaseService, Purchase } from '../../services/purchase.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './purchase-list.component.html',
  styleUrls: ['./purchase-list.component.css']
})
export class PurchaseListComponent implements OnInit {
  purchases: Purchase[] = [];
  filteredPurchases: Purchase[] = [];
  loading = true;
  error = '';
  timeRange: string = 'all';
  categories: string[] = [];
  selectedCategory: string = 'all';

  constructor(
    private purchaseService: PurchaseService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPurchases();
  }

  loadPurchases(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.purchaseService.getPurchases(user.id, this.timeRange, this.selectedCategory).subscribe({
        next: (data) => {
          this.purchases = data;
          this.extractCategories();
          this.filterPurchases();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar las compras';
          this.loading = false;
          console.error(err);
        }
      });
    }
  }

  extractCategories(): void {
    const uniqueCategories = new Set(this.purchases.map(p => p.category));
    this.categories = Array.from(uniqueCategories);
  }

  filterPurchases(): void {
    this.filteredPurchases = this.purchases;
    if (this.selectedCategory !== 'all') {
      this.filteredPurchases = this.filteredPurchases.filter(
        p => p.category === this.selectedCategory
      );
    }
  }

  onRangeChange(): void {
    this.loadPurchases();
  }

  onCategoryChange(): void {
    this.loadPurchases();
  }

  deletePurchase(id: string): void {
    if (confirm('¿Estás seguro de eliminar esta compra?')) {
      this.purchaseService.deletePurchase(id).subscribe({
        next: () => {
          this.loadPurchases();
        },
        error: (err) => {
          this.error = 'Error al eliminar la compra';
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
}