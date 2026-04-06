import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const STORAGE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'debts',
        pathMatch: 'full'
      },
      {
        path: 'debts',
        loadComponent: () => import('./components/debt-list/debt-list.component').then(m => m.DebtListComponent)
      },
      {
        path: 'debts/new',
        loadComponent: () => import('./components/debt-form/debt-form.component').then(m => m.DebtFormComponent)
      },
      {
        path: 'debts/:id/edit',
        loadComponent: () => import('./components/debt-form/debt-form.component').then(m => m.DebtFormComponent)
      },
      {
        path: 'incomes',
        loadComponent: () => import('./components/income-list/income-list.component').then(m => m.IncomeListComponent)
      },
      {
        path: 'incomes/new',
        loadComponent: () => import('./components/income-form/income-form.component').then(m => m.IncomeFormComponent)
      },
      {
        path: 'incomes/:id/edit',
        loadComponent: () => import('./components/income-form/income-form.component').then(m => m.IncomeFormComponent)
      }
    ]
  }
];