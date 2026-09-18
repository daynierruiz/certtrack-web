import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { GeoapifyAutocompleteResponse, GeoapifyFeature } from '../models/address.model';

@Injectable({ providedIn: 'root' })
export class GeoapifyService {
  private readonly baseUrl = 'https://api.geoapify.com/v1/geocode/autocomplete';

  constructor(private http: HttpClient) {}

  /**
   * Autocomplete US addresses. Returns up to `limit` suggestions, or [] on error
   * (so the UI never breaks just because Geoapify is down — the user can still
   * type, but the backend will reject the submit without valid lat/lng/place_id).
   */
  autocomplete(text: string, limit = 5): Observable<GeoapifyFeature[]> {
    if (!text || text.trim().length < 3) {
      return of([]);
    }
    const params = new HttpParams()
      .set('text', text.trim())
      .set('filter', 'countrycode:us')
      .set('format', 'geojson')
      .set('limit', String(limit))
      .set('apiKey', environment.geoapifyApiKey);

    return this.http.get<GeoapifyAutocompleteResponse>(this.baseUrl, { params }).pipe(
      map(res => res.features ?? []),
      catchError(() => of([]))
    );
  }
}
