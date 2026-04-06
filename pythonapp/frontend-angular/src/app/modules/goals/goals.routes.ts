import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const GOALS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/goal-list/goal-list.component').then(m => m.GoalListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./components/goal-form/goal-form.component').then(m => m.GoalFormComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./components/goal-form/goal-form.component').then(m => m.GoalFormComponent)
      }
    ]
  }
];