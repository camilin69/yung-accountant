import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./modules/home/home.routes').then(m => m.HOME_ROUTES)
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./modules/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
  },
  {
    path: 'goals',
    loadChildren: () => import('./modules/goals/goals.routes').then(m => m.GOALS_ROUTES)
  },
  {
    path: 'savings',
    loadChildren: () => import('./modules/savings/savings.routes').then(m => m.SAVINGS_ROUTES)
  },
  {
    path: 'purchases',
    loadChildren: () => import('./modules/purchases/purchases.routes').then(m => m.PURCHASES_ROUTES)
  },
  {
    path: 'storage',
    loadChildren: () => import('./modules/storage/storage.routes').then(m => m.STORAGE_ROUTES)
  },
  {
    path: '**',
    redirectTo: ''
  }
];