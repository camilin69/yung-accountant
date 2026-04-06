import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';

export interface Purchase {
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
export class PurchaseService {
  private apiUrl = environment.apiUrls.purchases;

  constructor(private http: HttpClient) {}

  getPurchases(userId: string, range: string = 'all', category: string = 'all'): Observable<Purchase[]> {
    return this.http.get<Purchase[]>(`${this.apiUrl}/api/purchases?user_id=${userId}&range=${range}&category=${category}`);
  }

  createPurchase(purchase: Omit<Purchase, '_id' | 'created_at' | 'updated_at'>): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(`${this.apiUrl}/api/purchases`, purchase);
  }

  updatePurchase(id: string, purchase: Partial<Purchase>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/api/purchases/${id}`, purchase);
  }

  deletePurchase(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/api/purchases/${id}`);
  }

  getPurchaseStats(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/purchases/user/${userId}/stats`);
  }
}