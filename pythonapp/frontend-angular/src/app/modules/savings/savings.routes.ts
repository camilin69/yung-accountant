import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const SAVINGS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/saving-list/saving-list.component').then(m => m.SavingListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./components/saving-form/saving-form.component').then(m => m.SavingFormComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./components/saving-form/saving-form.component').then(m => m.SavingFormComponent)
      }
    ]
  }
];