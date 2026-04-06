import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GoalService, Goal } from '../../services/goal.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-goal-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './goal-list.component.html',
  styleUrls: ['./goal-list.component.css']
})
export class GoalListComponent implements OnInit {
  goals: Goal[] = [];
  loading = true;
  error = '';

  constructor(
    private goalService: GoalService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadGoals();
  }

  loadGoals(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.goalService.getGoals(user.id).subscribe({
        next: (data) => {
          this.goals = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar las metas';
          this.loading = false;
          console.error(err);
        }
      });
    }
  }

  deleteGoal(id: string): void {
    if (confirm('¿Estás seguro de eliminar esta meta?')) {
      this.goalService.deleteGoal(id).subscribe({
        next: () => {
          this.loadGoals();
        },
        error: (err) => {
          this.error = 'Error al eliminar la meta';
          console.error(err);
        }
      });
    }
  }

  getProgress(goal: Goal): number {
    if (goal.target_amount === 0) return 0;
    return (goal.current_amount / goal.target_amount) * 100;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES');
  }
}