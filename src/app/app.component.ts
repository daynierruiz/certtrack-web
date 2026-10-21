import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { LanguageService } from './core/services/language.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  constructor() {
    // Apply the persisted/detected language before the first view renders.
    inject(LanguageService).init();

    // F-11: reconcile the cached user with the backend on each navigation so a
    // server-side role change doesn't leave the UI on a stale role until the
    // user logs in again. The call is throttled and fire-and-forget inside the
    // service, so this stays cheap.
    const authService = inject(AuthService);
    inject(Router).events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => authService.syncUserFromServer());
  }
}
