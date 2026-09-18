# CareReady — i18n conversion guide (Transloco)

Transloco v7 is **already installed and configured**. Loader reads
`src/assets/i18n/en.json` and `es.json`. Default lang `en`, fallback `en`,
`reRenderOnLangChange: true`. Language switcher lives in the layout toolbar.

This guide keeps terminology and the conversion pattern consistent across all
features. **Read it fully before converting a component.**

---

## Conversion pattern

### Templates (inline `template:` strings)
Add `TranslocoModule` to the component's `imports` array, then use the pipe:

```html
<!-- before -->
<span matListItemTitle>Employees</span>
<button mat-raised-button color="primary">Save</button>
<mat-label>First Name</mat-label>

<!-- after -->
<span matListItemTitle>{{ 'employees.title' | transloco }}</span>
<button mat-raised-button color="primary">{{ 'common.save' | transloco }}</button>
<mat-label>{{ 'employees.form.firstName' | transloco }}</mat-label>
```

Import:
```ts
import { TranslocoModule } from '@jsverse/transloco';
// ...
imports: [ /* existing */, TranslocoModule ],
```

#### Interpolation with values
Use params for dynamic text, never string-concatenate translated fragments:
```html
<!-- "Showing 5 of 20" -->
{{ 'employees.showingCount' | transloco: { shown: shown, total: total } }}
```
```json
"showingCount": "Showing {{shown}} of {{total}}"
```

#### Attributes (placeholder, aria-label, matTooltip, title)
```html
<input [placeholder]="'employees.searchPlaceholder' | transloco">
<button [matTooltip]="'common.edit' | transloco">
```

### TypeScript strings (snackbars, programmatic messages, dialog data)
Inject `TranslocoService` and call `.translate(...)`:
```ts
import { TranslocoService } from '@jsverse/transloco';
// ...
constructor(private transloco: TranslocoService, /* ... */) {}

this.snackBar.open(this.transloco.translate('employees.savedOk'), 'OK', { duration: 3000 });
// with params:
this.transloco.translate('employees.deletedName', { name: emp.fullName });
```
When opening the shared ConfirmDialog, pass **translated** strings as `title`/`message`/`confirmText`.

---

## Rules

1. **Do NOT touch** `en.json`, `es.json`, `app.config.ts`, `transloco-loader.ts`,
   `language.service.ts`, or any other feature's files. Only edit the component
   files assigned to you, and write your own part file (see "Output").
2. **Translate only UI chrome**: labels, buttons, headings, placeholders, tooltips,
   table headers, validation/help text, snackbar/confirm messages, empty-states,
   menu items, tab labels, aria-labels.
3. **Do NOT translate**:
   - Data from the API (names, emails, agency names, credential names, template
     names, document file names, addresses, dates rendered via pipes).
   - Backend error messages received as `err.error?.message` — keep showing them
     as-is, but translate any hard-coded **fallback** string after `||`.
   - CSS, Material icon names (`<mat-icon>delete</mat-icon>` stays `delete`),
     routerLinks, form control names, property names, console logs.
4. **Enums shown to the user** (status badges like `EXPIRED`, `PENDING`, role
   names, credential status): translate the **display** via a key map under your
   namespace, e.g. `credentials.status.EXPIRED`. Keep switch/if logic on the raw
   enum value. If a status set is shared, put it under your namespace anyway
   (duplication across features is fine for this pass).
5. Preserve all logic, bindings, styles, whitespace, and the existing
   `@if` / `@for` control-flow syntax. Change only the human-readable text.
6. Reuse the shared `common.*` keys below for those exact words. Anything not in
   the common list goes under **your feature namespace**.
7. Keys are camelCase, grouped by sub-area (e.g. `list`, `form`, `dialog`,
   `detail`). Keep both `en` and `es` in sync — every key in both languages.

---

## Shared `common.*` keys (already exist — reuse, do not redefine)

| key | English | Español |
|---|---|---|
| common.save | Save | Guardar |
| common.saving | Saving... | Guardando... |
| common.cancel | Cancel | Cancelar |
| common.delete | Delete | Eliminar |
| common.edit | Edit | Editar |
| common.close | Close | Cerrar |
| common.add | Add | Agregar |
| common.create | Create | Crear |
| common.update | Update | Actualizar |
| common.search | Search | Buscar |
| common.loading | Loading... | Cargando... |
| common.yes | Yes | Sí |
| common.no | No | No |
| common.confirm | Confirm | Confirmar |
| common.back | Back | Atrás |
| common.next | Next | Siguiente |
| common.previous | Previous | Anterior |
| common.submit | Submit | Enviar |
| common.actions | Actions | Acciones |
| common.view | View | Ver |
| common.download | Download | Descargar |
| common.upload | Upload | Subir |
| common.remove | Remove | Quitar |
| common.status | Status | Estado |
| common.name | Name | Nombre |
| common.date | Date | Fecha |
| common.type | Type | Tipo |
| common.notes | Notes | Notas |
| common.email | Email | Correo electrónico |
| common.phone | Phone | Teléfono |
| common.active | Active | Activo |
| common.inactive | Inactive | Inactivo |
| common.none | None | Ninguno |
| common.all | All | Todos |
| common.required | Required | Requerido |
| common.optional | Optional | Opcional |
| common.noResults | No results found | No se encontraron resultados |
| common.error | Error | Error |
| common.success | Success | Éxito |
| common.retry | Retry | Reintentar |

Also available: `roles.OWNER|ADMIN|EMPLOYEE`, `nav.*`, `auth.*`.

---

## Domain terminology (EN → ES) — use these translations consistently

| English | Español |
|---|---|
| Dashboard | Panel |
| Employee / Employees | Empleado / Empleados |
| Credential / Credentials | Credencial / Credenciales |
| Position / Positions | Puesto / Puestos |
| Applicant / Applicants | Solicitante / Solicitantes |
| Contract / Contracts | Contrato / Contratos |
| Contract Template | Plantilla de contrato |
| Profile | Perfil |
| Agency | Agencia |
| Onboarding | Onboarding |
| Compliance | Cumplimiento |
| Home Care | Cuidado en el hogar |
| Review / Pending Review | Revisión / Revisión pendiente |
| Approve / Approved | Aprobar / Aprobado |
| Reject / Rejected | Rechazar / Rechazado |
| Verify / Verified | Verificar / Verificado |
| Pending | Pendiente |
| Expired | Vencido |
| Expiring / Expiring Soon | Por vencer / Por vencer pronto |
| Valid | Vigente |
| Missing | Faltante |
| Issue Date | Fecha de emisión |
| Expiration Date / Expiry | Fecha de vencimiento |
| Hire Date | Fecha de contratación |
| Start Date | Fecha de inicio |
| First Name | Nombre |
| Last Name | Apellido |
| Full Name | Nombre completo |
| Address | Dirección |
| City | Ciudad |
| State | Estado |
| ZIP / Zip Code | Código postal |
| Date of Birth | Fecha de nacimiento |
| Document | Documento |
| Upload / Uploaded | Subir / Subido |
| File | Archivo |
| Sign / Signature | Firmar / Firma |
| Generate | Generar |
| Send / Sent | Enviar / Enviado |
| Invite / Invitation | Invitar / Invitación |
| Hiring | Contratación |
| Roadmap | Proceso |
| Step | Paso |
| Complete / Completed | Completar / Completado |
| Incomplete | Incompleto |
| Required | Requerido |
| Title | Título |
| Description | Descripción |
| Compensation / Pay Rate | Compensación / Tarifa de pago |
| Hourly | Por hora |
| Salary | Salario |
| Notes | Notas |
| Cancel | Cancelar |
| Save Changes | Guardar cambios |
| Add New | Agregar nuevo |
| No data / No records | Sin datos / Sin registros |

> When unsure, prefer neutral Latin-American Spanish. Keep product/brand names
> ("CareReady") and template/credential names from the DB untranslated.

---

## Output (per agent)

Edit your assigned component files in place, then create ONE part file:
`src/assets/i18n/parts/<yourPartName>.json` with this exact shape:

```json
{
  "en": { "<yourNamespace>": { "...": "..." } },
  "es": { "<yourNamespace>": { "...": "..." } }
}
```

Both `en` and `es` must contain the **same key structure**. These part files are
merged into the root `en.json` / `es.json` afterwards.
