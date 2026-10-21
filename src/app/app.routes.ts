import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { adminGuard, employeeGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Public pages (no auth required)
  {
    path: 'apply',
    loadComponent: () => import('./features/applicant/apply/apply.component').then(m => m.ApplyComponent)
  },
  {
    path: 'apply/:key',
    loadComponent: () => import('./features/applicant/apply/apply.component').then(m => m.ApplyComponent)
  },
  {
    path: 'set-password',
    loadComponent: () => import('./features/applicant/set-password/set-password.component').then(m => m.SetPasswordComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'employees',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/employees/employee-list/employee-list.component').then(m => m.EmployeeListComponent)
      },
      {
        path: 'employees/:publicId',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/employees/employee-profile/employee-profile.component').then(m => m.EmployeeProfileComponent)
      },
      {
        path: 'credentials',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/credentials/credential-list/credential-list.component').then(m => m.CredentialListComponent)
      },
      {
        path: 'positions',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/positions/position-list.component').then(m => m.PositionListComponent)
      },
      {
        path: 'review',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/credentials/credential-review/credential-review.component').then(m => m.CredentialReviewComponent)
      },
      {
        path: 'applicants',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/applicant/applicant-list/applicant-list.component').then(m => m.ApplicantListComponent)
      },
      {
        path: 'map',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/map/employee-map.component').then(m => m.EmployeeMapComponent)
      },
      {
        path: 'contract-templates',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/contracts/contract-template-list/contract-template-list.component').then(m => m.ContractTemplateListComponent)
      },
      {
        path: 'my-profile',
        canActivate: [employeeGuard],
        loadComponent: () => import('./features/my-profile/my-profile.component').then(m => m.MyProfileComponent)
      },
      {
        path: 'settings/agent',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/settings/agent-settings/agent-settings.component').then(m => m.AgentSettingsComponent)
      },
      {
        path: 'account',
        loadComponent: () => import('./features/account/account.component').then(m => m.AccountComponent)
      },
      {
        path: 'risk',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/risk/risk-list.component').then(m => m.RiskListComponent)
      },
      {
        path: 'reports',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
