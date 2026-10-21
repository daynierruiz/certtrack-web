import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InboxNotification {
  publicId: string;
  type: string;
  subject: string | null;
  status: string;
  createdAt: string;
  readAt: string | null;
}

interface UnreadCountResponse { unread: number; }

@Injectable({ providedIn: 'root' })
export class NotificationInboxService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getInbox(): Observable<InboxNotification[]> {
    return this.http.get<InboxNotification[]>(`${this.apiUrl}/inbox`);
  }

  unreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/inbox/unread-count`);
  }

  markRead(publicId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${publicId}/read`, {});
  }
}
