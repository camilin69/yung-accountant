import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const PURCHASES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/purchase-list/purchase-list.component').then(m => m.PurchaseListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./components/purchase-form/purchase-form.component').then(m => m.PurchaseFormComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./components/purchase-form/purchase-form.component').then(m => m.PurchaseFormComponent)
      }
    ]
  }
];