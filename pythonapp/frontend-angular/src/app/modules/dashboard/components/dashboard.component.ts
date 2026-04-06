import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GoalService } from '../../goals/services/goal.service';
import { SavingService } from '../../savings/services/saving.service';
import { PurchaseService } from '../../purchases/services/purchase.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: any;
  goalStats: any = {};
  savingStats: any = {};
  purchaseStats: any = {};
  loading = true;

  constructor(
    private authService: AuthService,
    private goalService: GoalService,
    private savingService: SavingService,
    private purchaseService: PurchaseService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.loadStats();
  }

  loadStats(): void {
    const userId = this.user?.id;
    if (userId) {
      Promise.all([
        this.goalService.getGoalStats(userId).toPromise(),
        this.savingService.getSavingsStats(userId).toPromise(),
        this.purchaseService.getPurchaseStats(userId).toPromise()
      ]).then(([goals, savings, purchases]) => {
        this.goalStats = goals;
        this.savingStats = savings;
        this.purchaseStats = purchases;
        this.loading = false;
      }).catch(error => {
        console.error('Error loading stats:', error);
        this.loading = false;
      });
    }
  }
}