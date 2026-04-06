import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';

export interface Goal {
  _id?: string;
  user_id: string;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  end_date: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private apiUrl = environment.apiUrls.goals;

  constructor(private http: HttpClient) {}

  getGoals(userId: string): Observable<Goal[]> {
    return this.http.get<Goal[]>(`${this.apiUrl}/api/goals?user_id=${userId}`);
  }

  getGoal(id: string): Observable<Goal> {
    return this.http.get<Goal>(`${this.apiUrl}/api/goals/${id}`);
  }

  createGoal(goal: Omit<Goal, '_id' | 'created_at' | 'updated_at'>): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(`${this.apiUrl}/api/goals`, goal);
  }

  updateGoal(id: string, goal: Partial<Goal>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/api/goals/${id}`, goal);
  }

  deleteGoal(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/api/goals/${id}`);
  }

  getRecentGoals(userId: string): Observable<Goal[]> {
    return this.http.get<Goal[]>(`${this.apiUrl}/api/goals/user/${userId}/recent`);
  }

  getGoalStats(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/goals/user/${userId}/stats`);
  }
}