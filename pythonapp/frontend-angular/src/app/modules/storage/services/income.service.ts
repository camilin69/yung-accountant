import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';

export interface Income {
  _id?: string;
  user_id: string;
  date: string;
  source: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'annual' | 'one-time';
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IncomeService {
  private apiUrl = environment.apiUrls.storage;

  constructor(private http: HttpClient) {}

  getIncomes(userId: string): Observable<Income[]> {
    return this.http.get<Income[]>(`${this.apiUrl}/api/storage/incomes?user_id=${userId}`);
  }

  createIncome(income: Omit<Income, '_id' | 'created_at' | 'updated_at'>): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(`${this.apiUrl}/api/storage/incomes`, income);
  }

  updateIncome(id: string, income: Partial<Income>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/api/storage/incomes/${id}`, income);
  }

  deleteIncome(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/api/storage/incomes/${id}`);
  }
}