import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';

export interface Debt {
  _id?: string;
  user_id: string;
  type: 'debt' | 'credit';
  concept: string;
  amount: number;
  date: string;
  due_date?: string;
  status: 'pending' | 'paid';
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DebtService {
  private apiUrl = environment.apiUrls.storage;

  constructor(private http: HttpClient) {}

  getDebts(userId: string, type: string = 'all'): Observable<Debt[]> {
    return this.http.get<Debt[]>(`${this.apiUrl}/api/storage/debts?user_id=${userId}&type=${type}`);
  }

  createDebt(debt: Omit<Debt, '_id' | 'created_at' | 'updated_at'>): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(`${this.apiUrl}/api/storage/debts`, debt);
  }

  updateDebt(id: string, debt: Partial<Debt>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/api/storage/debts/${id}`, debt);
  }

  deleteDebt(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/api/storage/debts/${id}`);
  }
}