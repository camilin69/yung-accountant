import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GoalService, Goal } from '../../services/goal.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-goal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './goal-form.component.html',
  styleUrls: ['./goal-form.component.css']
})
export class GoalFormComponent implements OnInit {
  goal: Partial<Goal> = {
    title: '',
    description: '',
    target_amount: 0,
    current_amount: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  };
  isEditing = false;
  goalId: string | null = null;
  loading = false;
  error = '';

  constructor(
    private goalService: GoalService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.goalId = this.route.snapshot.paramMap.get('id');
    if (this.goalId) {
      this.isEditing = true;
      this.loadGoal();
    }
  }

  loadGoal(): void {
    if (this.goalId) {
      this.goalService.getGoal(this.goalId).subscribe({
        next: (data) => {
          this.goal = {
            ...data,
            start_date: new Date(data.start_date).toISOString().split('T')[0],
            end_date: new Date(data.end_date).toISOString().split('T')[0]
          };
        },
        error: (err) => {
          this.error = 'Error al cargar la meta';
          console.error(err);
        }
      });
    }
  }

  onSubmit(): void {
    if (!this.goal.title || !this.goal.target_amount || !this.goal.end_date) {
      this.error = 'Por favor completa todos los campos requeridos';
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

    const goalData = {
      ...this.goal,
      user_id: user.id,
      start_date: new Date(this.goal.start_date!).toISOString(),
      end_date: new Date(this.goal.end_date!).toISOString()
    };

    if (this.isEditing && this.goalId) {
      this.goalService.updateGoal(this.goalId, goalData).subscribe({
        next: () => {
          this.router.navigate(['/goals']);
        },
        error: (err) => {
          this.error = 'Error al actualizar la meta';
          this.loading = false;
          console.error(err);
        }
      });
    } else {
      this.goalService.createGoal(goalData as Omit<Goal, '_id' | 'created_at' | 'updated_at'>).subscribe({
        next: () => {
          this.router.navigate(['/goals']);
        },
        error: (err) => {
          this.error = 'Error al crear la meta';
          this.loading = false;
          console.error(err);
        }
      });
    }
  }
}