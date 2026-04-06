import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SavingService, Saving } from '../../services/saving.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-saving-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './saving-list.component.html',
  styleUrls: ['./saving-list.component.css']
})
export class SavingListComponent implements OnInit {
  savings: Saving[] = [];
  filteredSavings: Saving[] = [];
  loading = true;
  error = '';
  timeRange: string = 'all';
  categories: string[] = [];
  selectedCategory: string = 'all';

  constructor(
    private savingService: SavingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadSavings();
  }

  loadSavings(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.savingService.getSavings(user.id, this.timeRange).subscribe({
        next: (data) => {
          this.savings = data;
          this.extractCategories();
          this.filterSavings();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar los ahorros';
          this.loading = false;
          console.error(err);
        }
      });
    }
  }

  extractCategories(): void {
    const uniqueCategories = new Set(this.savings.map(s => s.category));
    this.categories = Array.from(uniqueCategories);
  }

  filterSavings(): void {
    this.filteredSavings = this.savings;
    if (this.selectedCategory !== 'all') {
      this.filteredSavings = this.filteredSavings.filter(
        s => s.category === this.selectedCategory
      );
    }
  }

  onRangeChange(): void {
    this.loadSavings();
  }

  onCategoryChange(): void {
    this.filterSavings();
  }

  deleteSaving(id: string): void {
    if (confirm('¿Estás seguro de eliminar este registro de ahorro?')) {
      this.savingService.deleteSaving(id).subscribe({
        next: () => {
          this.loadSavings();
        },
        error: (err) => {
          this.error = 'Error al eliminar el registro';
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