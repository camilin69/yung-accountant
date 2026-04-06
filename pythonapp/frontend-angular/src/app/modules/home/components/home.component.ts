import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  features = [
    {
      icon: '🎯',
      title: 'Metas Financieras',
      description: 'Establece y sigue tus metas de ahorro, visualiza tu progreso y alcanza tus objetivos financieros.',
      link: '/goals',
      color: '#3498db'
    },
    {
      icon: '💰',
      title: 'Ahorros',
      description: 'Registra tus ahorros por categorías, lleva un control detallado y proyecta tus ahorros futuros.',
      link: '/savings',
      color: '#2ecc71'
    },
    {
      icon: '🛒',
      title: 'Control de Gastos',
      description: 'Registra tus compras, clasifícalas por categorías y analiza tus patrones de consumo.',
      link: '/purchases',
      color: '#e74c3c'
    },
    {
      icon: '📊',
      title: 'Finanzas Personales',
      description: 'Gestiona deudas, créditos e ingresos, obtén proyecciones financieras y mantén tu salud financiera.',
      link: '/storage',
      color: '#9b59b6'
    }
  ];

  constructor(public authService: AuthService) {}
}