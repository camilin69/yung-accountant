import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';

export interface Saving {
  _id?: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SavingService {
  private apiUrl = environment.apiUrls.savings;

  constructor(private http: HttpClient) {}

  getSavings(userId: string, range: string = 'all'): Observable<Saving[]> {
    return this.http.get<Saving[]>(`${this.apiUrl}/api/savings?user_id=${userId}&range=${range}`);
  }

  createSaving(saving: Omit<Saving, '_id' | 'created_at' | 'updated_at'>): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(`${this.apiUrl}/api/savings`, saving);
  }

  updateSaving(id: string, saving: Partial<Saving>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/api/savings/${id}`, saving);
  }

  deleteSaving(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/api/savings/${id}`);
  }

  getSavingsStats(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/savings/user/${userId}/stats`);
  }
}