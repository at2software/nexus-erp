# Signal Forms Pattern (Angular 22)

Status: **pattern defined, one pilot shipped, bulk migration NOT recommended yet.**

Pilot: `src/app/profile/profile-sick-note/`.

Everything below was verified against the installed `@angular/forms@22.0.8` in
`node_modules`, not against blog posts. Where a claim comes from library source,
the file and symbol are named so you can re-check it after an upgrade.

---

## 0. Corrections to assumptions

Two things people keep repeating about this codebase are wrong:

1. **`form()`, `schema()` etc. are not in `@angular/forms`.** They live in the
   `@angular/forms/signals` entry point (`package.json` → `exports["./signals"]`).
2. **There is no `Control` directive.** The binding directive is `FormField`,
   selector `[formField]`, exported from `@angular/forms/signals`.

Also, **`src/directives/debounced-model.directive.ts` does not exist.** `CLAUDE.md`
mandates a `[debouncedModel]` / `(debouncedModelChange)` / `[debounceTime]`
directive, and there is exactly one reference to it in the whole repository — the
`CLAUDE.md` paragraph itself. No template uses it, no file defines it. The
convention is stale and should be deleted from `CLAUDE.md` (see §4).

---

## 1. How forms work here today

Short version: **this app has almost no forms.** It has two-way bindings.

| Fact | Count | Evidence |
| --- | --- | --- |
| Templates using `ngModel` | 111 | `grep -rl ngModel src --include=*.html` |
| Distinct `ngModel` binding expressions | 359 | |
| …bound to a property of an object (`x.y`) | 206 | |
| …bound to a flat component field | 153 | |
| `<form>` elements in the app | 2 | `marketing-initiatives`, `milestone-popup` |
| `FormGroup` / `FormBuilder` usages | 1 component | `custom-gantt/milestone-popup` |
| Templates using `[autosave]` | 14 | |
| `ControlValueAccessor` implementations we own | 1 | `i18n-textarea` |

### Binding

`ngModel` is used **standalone** — no `name=`, no enclosing `ngForm`, no
`ngModelGroup`. It is pure two-way-binding sugar. There is no form object, no
form state, no submit pipeline.

### Validation

There is effectively **no client-side validation**.

- One component uses `Validators` (`milestone-popup.component.ts`).
- Nine templates carry a bare `required` attribute, which does nothing without an
  enclosing `ngForm`.
- Everything else is ad-hoc: e.g. `ProfileVacationRequestComponent.isFormValid()`
  is a hand-rolled predicate feeding `[disabled]` on the submit button.

**Validation lives in the backend.** The frontend mostly finds out via the HTTP
error response.

### Dirty tracking and persistence

Dirty tracking is **not** in the forms layer. It is on the model:
`Serializable#captureBaseline()` snapshots `JSON.stringify(toPayload())`, and
`Serializable#dirtyFields()` diffs against it. `Serializable#update()` PUTs
`dirtyFields()` by default.

Persistence is `src/directives/autosave.directive.ts`:

- binds to a `Serializable` (`[autosave]="model"`),
- listens to `blur` (and `beforeunload`, and `ngOnDestroy`) **outside the Angular zone**,
- compares the current value against `#lastValue`,
- calls `model.update(...)` and toasts.

It reads the value one of two ways: `autosaveKey` (reads `model[key]` directly) or
its `ngModel` **input** — i.e. it piggybacks on the `ngModel` input name so that
`[(ngModel)]` on the same element also feeds the directive.

### Custom controls

`src/app/_shards/i18n-textarea/` is the only CVA we own. It provides
`NG_VALUE_ACCESSOR`, and switches between a plain `string` and an
`I18nVariant[]` payload. It is already signal-based internally
(`#internalValue`, `#i18nVariants` are signals); only the CVA plumbing is legacy.

Third-party CVAs in use on form inputs: `ngx-daterangepicker-material`
(`input[ngxDaterangepickerMd]`), `ngx-color-picker`, `ngx-quill`, ng-bootstrap.

---

## 2. The decision, and the blocker

### 2.1 The blocker: `form()` cannot wrap a `Serializable`

This is the single most important finding and it is structural.

Signal Forms writes a child field by **spreading the parent object**.
From `node_modules/@angular/forms/fesm2022/_validation_errors-chunk.mjs`:

```js
function deepSignal(source, prop) {
  const read = computed(() => source()[prop()]);
  read.set = value => { source.update(current => valueForWrite(current, value, prop())); };
  ...
}

function valueForWrite(sourceValue, newPropValue, prop) {
  if (isArray(sourceValue)) { const newValue = [...sourceValue]; newValue[prop] = newPropValue; return newValue; }
  else { return { ...sourceValue, [prop]: newPropValue }; }   // <-- here
}
```

If the model behind `form()` is a `Serializable` instance, then **every single
keystroke** replaces it with a plain object literal. That destroys:

- the **prototype** — `update()`, `store()`, `delete()`, `apiPath()`,
  `getStateIcon()`, and the whole `INxContextMenu` contract the `[nx]` directive
  requires;
- the **private fields** — `#state`, `#baseline` are not copied by spread, so any
  method that did survive would throw;
- **object identity** — `LiveModelRegistry`, `[nx]`, and `dirtyFields()`'
  baseline all key off the instance.

There is no configuration flag that changes this. `form()` requires plain,
spreadable data.

Now cross-reference that with §1: **206 of 359 `ngModel` bindings are
`model.property`**, and the roots are overwhelmingly `Serializable` instances —
`_item`, `_project`, `_product`, `vacation`, `grant`, `company`, `card`,
`plugin`, `_calendarEntry`, `sel`, `monitor`. All 14 `[autosave]` templates are by
definition on `Serializable`s.

**Conclusion: the majority of this app's `ngModel` usage cannot move to Signal
Forms without first replacing the "mutate a live model instance in place" data
architecture.** That is a data-layer project, not a forms project.

### 2.2 Where Signal Forms *does* fit

Forms whose model is **plain local component state** — a "new X" dialog, a filter
bar, a wizard step, a search panel. Those are the ~153 flat bindings, minus the
ones that are really just `[(ngModel)]`-as-signal-binding.

The pilot (`profile-sick-note`) is exactly this shape.

### 2.3 `[debouncedModel]` → native `debounce()`

Nothing to migrate — the directive does not exist (§0). Going forward, the Signal
Forms answer is native and better:

```ts
debounce(path, 300);        // ms
debounce(path, 'blur');     // flush on blur
debounce(path, customFn);   // Debouncer<TValue, TPathKind>
```

Signature verified in `types/signals.d.ts:676`. Crucially, `FieldState` exposes
**two** value signals: `controlValue` (immediate, un-debounced, what the DOM
control holds) and `value` (the debounced model). The field is marked dirty
immediately even while `value` lags — see `controlValueSignal()` in
`_validation_errors-chunk.mjs`. That is strictly better than a hand-rolled
debounce directive, which had no way to express "dirty now, value later".

**Action: delete the `[debouncedModel]` paragraph from `CLAUDE.md`** and replace
it with `debounce()` guidance.

### 2.4 ControlValueAccessors survive

Verified in `node_modules/@angular/forms/fesm2022/signals.mjs`, `FormField.ɵngControlCreate`:

```js
if (this.controlValueAccessor)        { ... cvaControlCreate(host, this); }
else if (host.customControl)          { ... customControlCreate(host, this); }
else if (this.elementIsNativeFormElement) { ... nativeControlCreate(...); }
else throw new RuntimeError(1914, ...);
```

`FormField` injects `NG_VALUE_ACCESSOR` on its host and **prefers the CVA over
native element binding**. So `[formField]` on a CVA host works — the pilot proves
it against `input[ngxDaterangepickerMd]`, which is a third-party CVA on a native
`<input>` (the CVA branch wins).

So:

- **`i18n-textarea` keeps working as-is under `[formField]`.** No emergency.
- The Angular docs call the CVA path "for backwards compatibility with reactive
  forms. Prefer options (1) and (2)." The *target* state is
  `FormValueControl<T>`: drop `NG_VALUE_ACCESSOR` + `forwardRef` +
  `registerOnChange`/`registerOnTouched`, expose `value = model<I18nValue>()`.
  For `i18n-textarea` that is a small, mechanical win (it is already signal-based
  inside), but it is **not a blocker** and should be done lazily.

### 2.5 Autosave does not hook into Signal Forms — and mostly can't

`[autosave]` is not a validation concern; it is "blur → PUT dirty fields on a
`Serializable`". Two independent problems:

1. It reads its value through an input literally named `ngModel`. Under
   `[formField]` there is no `ngModel` input, so `[autosave]` + `[formField]`
   would **silently** stop tracking values unless `autosaveKey` is set. Silent
   data loss — the worst failure mode.
2. Its target is always a `Serializable`, which per §2.1 cannot be a form model
   at all.

So autosave forms are blocked on the same data-architecture problem. If/when that
is solved, the clean hook is `FieldState`, which exposes exactly what autosave
needs: `touched()`, `dirty()`, `valid()`, plus `markAsPristine()` after a
successful save. Sketch (do **not** build this until §2.1 is resolved):

```ts
effect(() => {
    const state = this.field()();
    if (state.dirty() && state.touched() && state.valid()) { /* PUT, then state.markAsPristine() */ }
});
```

### 2.6 Where validation should live

Today: backend. Target: **both**, with the schema colocated with the model.

- Put a `schema<T>()` next to the thing it validates and export it, so it can be
  composed with `apply()` / `applyWhen()` rather than copy-pasted.
- Keep the backend as the source of truth. Signal Forms `schema()` is a UX
  affordance, not a security boundary.
- Use `validateHttp()` (`types/signals.d.ts:478`) for genuinely server-side rules
  (uniqueness etc.) instead of inventing a bespoke async validator.
- Error messages are `$localize` strings, added to **both** `messages.xlf` and
  `messages.de.xlf` per `CLAUDE.md`.

---

## 3. The pattern (pilot: `profile-sick-note`)

### Rules

1. The form model is a **plain interface**, declared in the component file.
   Never a `Serializable`. Convert to/from the model at the submit boundary.
2. Hold it in a `#`-private `signal`, expose the `FieldTree` as a `readonly` field.
3. Put validation in a module-level `schema<T>()` const, not inline, so it is
   testable and composable.
4. Bind with `[formField]`, import `FormField` (not `FormsModule`).
5. Submit through `submit()` — it marks fields touched, blocks on invalid, and
   gives you server-error plumbing for free.
6. Reset with `field().reset(value)`.
7. Error display: gate on `touched() && !valid()`, render `errors()`, style with
   `text-danger` / `is-invalid`. Never `text-secondary`.

### Before

```ts
export class ProfileSickNoteComponent {
    sickPeriod: TimePeriod | null = null;
    hasESickNote = signal(false);

    onSendSickNote() {
        const payload = Vacation.fromJson({ started_at: this.sickPeriod?.startDate?.format?.('YYYY-MM-DD') ?? ..., ... });
        this.formHasBeenSent.set(true);
        this.#vacationService.storeSickNote(payload).subscribe();
    }
    onResetForm() { this.sickPeriod = null; this.hasESickNote.set(false); this.formHasBeenSent.set(false); }
}
```

```html
<input type="text" class="form-control" ngxDaterangepickerMd [(ngModel)]="sickPeriod" [autoApply]="true" ... />
<input class="form-check-input" type="checkbox" [ngModel]="hasESickNote()" (ngModelChange)="hasESickNote.set($event)" />
<button class="btn btn-fancy btn-fancy-be" (click)="onSendSickNote()">send sick note</button>
```

Note what is missing: nothing stops you submitting with no date selected. The
button is always enabled.

### After

```ts
import { FormField, form, required, schema, submit } from '@angular/forms/signals';

/** Plain form state. Never a `Serializable` instance. */
interface SickNoteForm {
    period: TimePeriod | null;
    hasESickNote: boolean;
}

const EMPTY_SICK_NOTE: SickNoteForm = { period: null, hasESickNote: false };

const sickNoteSchema = schema<SickNoteForm>((sickNote) => {
    required(sickNote.period, { message: $localize`:@@i18n.profile.sickPeriodRequired:please pick the period you were sick` });
});

@Component({ imports: [EmptyStateComponent, FormField, NgxDaterangepickerMd], ... })
export class ProfileSickNoteComponent {
    #model = signal<SickNoteForm>({ ...EMPTY_SICK_NOTE });
    readonly sickNote = form(this.#model, sickNoteSchema);

    onSendSickNote() {
        void submit(this.sickNote, async (field) => {
            const { period, hasESickNote } = field().value();
            const payload = Vacation.fromJson({ started_at: period?.startDate?.format?.('YYYY-MM-DD') ?? period?.startDate, ... });
            this.formHasBeenSent.set(true);
            this.#vacationService.storeSickNote(payload).subscribe();
        });
    }

    onResetForm() {
        this.sickNote().reset({ ...EMPTY_SICK_NOTE });
        this.formHasBeenSent.set(false);
    }
}
```

```html
@let _period = sickNote.period();
...
<input type="text" class="form-control" [class.is-invalid]="_period.touched() && !_period.valid()"
       ngxDaterangepickerMd [formField]="sickNote.period" [autoApply]="true" ... />
@if (_period.touched() && !_period.valid()) {
    @for (error of _period.errors(); track error.kind) {
        <div class="text-danger small mt-1">{{ error.message }}</div>
    }
}

<input class="form-check-input" type="checkbox" role="switch" id="eSickNote" [formField]="sickNote.hasESickNote" />

@if (!sickNote.hasESickNote().value()) { ... }

<button class="btn btn-fancy btn-fancy-be" [disabled]="!sickNote().valid()" (click)="onSendSickNote()">send sick note</button>
```

What the migration bought: real validation, a disabled-until-valid submit,
localized inline errors, and no `FormsModule`.

Note the shape change in the template: `sickNote.period` is a `FieldTree`
(pass this to `[formField]`), while `sickNote.period()` is the `FieldState`
(read `.value()`, `.touched()`, `.valid()`, `.errors()` off this). Bind the
tree, read the state.

---

## 4. Blockers for the remaining 110 templates

Ordered by how much they hurt.

1. **`Serializable` models cannot be form models** (§2.1). Blocks ~206 of 359
   bindings including all 14 `[autosave]` templates. Requires replacing in-place
   model mutation with plain-data form models plus an explicit save step.
   *This is a data-layer refactor and it is by far the largest item.*
2. **`[autosave]` silently breaks under `[formField]`** (§2.5). Its value input is
   named `ngModel`. Any partial migration that leaves `[autosave]` on a
   `[formField]` element loses edits with no error. If any bulk migration
   happens, `[autosave]` must be made to *fail loudly* first.
3. **`[nx]` requires live model instances.** `[nx]` takes an `INxContextMenu`,
   which every `Serializable` implements. Spread-cloned form values are not
   `Serializable`, so `[nx]` and its context-menu / double-click / cyan-hover
   behaviour die on any element whose model went through a `FieldTree`. This
   interacts badly with `CLAUDE.md`'s click-consistency mandate.
4. **`i18n-textarea` should become a `FormValueControl`** (§2.4). Not blocking —
   the CVA path works — but it is technical debt with a known, cheap fix.
5. **`Serializable#dirtyFields()` vs `FieldState.dirty()`** are two independent,
   non-communicating dirty models. Anything driving a PUT off the wrong one will
   send the wrong payload.
6. **Third-party CVAs are the load-bearing controls.** daterangepicker, quill,
   color-picker, ng-bootstrap. They work today via the compat path, which Angular
   explicitly documents as backwards-compatibility. Migration risk sits with
   whether that path survives future majors.
7. **No test coverage for forms.** The suite is 39 tests and none of them touch a
   form. There is no safety net for a 110-template change. Any bulk migration
   needs characterization tests written *first*.
8. **`CLAUDE.md` documents a directive that does not exist** (`[debouncedModel]`).
   Fix the doc before anyone writes code against it.

---

## 5. Recommendation

**Do not bulk-migrate.** Migrate opportunistically, under one rule:

> Use Signal Forms when the form model is plain local state you were going to
> throw away on submit. Keep `ngModel` when the "form" is a live `Serializable`
> being edited in place.

Concretely:

- **Do now, cheaply:** new forms; "create X" modals; filter/search panels;
  wizard steps. These are greenfield-ish and get real validation out of it.
- **Do soon:** convert `i18n-textarea` from CVA to `FormValueControl`. Small,
  self-contained, removes `forwardRef` boilerplate.
- **Do soon:** fix `CLAUDE.md` (§0, §2.3).
- **Do not touch:** anything with `[autosave]`, anything with `[nx]` on the same
  model, anything binding `ngModel` into a `Serializable`. That is the majority
  of the 111 and it is blocked on item 1 above, which is a data-architecture
  decision, not a forms decision.
- **Prerequisite for ever doing the rest:** decide whether `Serializable`
  in-place editing stays. If it stays, Signal Forms will never cover most of this
  app, and that is a perfectly reasonable end state — `ngModel` is not deprecated.
