# NEXUS Backend — Code Improvement Backlog

This folder contains independent, self-contained improvement tasks for the NEXUS Laravel
backend (`c:\Users\User\Documents\NEXUS\backend`). Each file is written so a single Sonnet
instance can pick it up, understand the context, and execute it **without** needing the others.

## How to use

1. Pick one file.
2. Read its "Context" and "What to do" sections.
3. Apply the changes, run `vendor/bin/pint` and `php artisan test` (see TASK-12 — there are
   currently no tests), and verify the app boots.
4. Each task lists concrete file paths and line references gathered on review date
   **2026-06-11** against branch `master`. Line numbers may drift — search by the quoted
   snippet rather than trusting the exact line.

## Priority ordering

| Prio | Task | Theme | Status | Risk if ignored |
|------|------|-------|--------|-----------------|
| P0 | [TASK-01](01-ssrf-corscontroller.md) | SSRF via open URL proxy | ✅ Done | Server-side request forgery, internal network access |
| P0 | [TASK-02](02-mass-assignment.md) | Mass assignment / unvalidated input | ✅ Done | Privilege escalation, arbitrary column writes |
| P1 | [TASK-03](03-raw-sql-identifier-interpolation.md) | Raw SQL identifier interpolation | ✅ Done | SQL injection surface |
| P1 | [TASK-04](04-disabled-tls-verification.md) | Disabled TLS verification | ✅ Done | MITM on outbound requests |
| P1 | [TASK-05](05-env-outside-config.md) | `env()` outside config | ✅ Done | Breaks `config:cache`, silent prod misconfig |
| P1 | [TASK-06](06-n-plus-1-and-query-perf.md) | N+1 queries & in-PHP aggregation | ✅ Done | Slow endpoints, DB load |
| P2 | [TASK-07](07-modernize-php-syntax.md) | Legacy PHP syntax | ✅ Done | Maintainability |
| P2 | [TASK-08](08-native-enums.md) | bensampo enums → native | ✅ Done | Deprecated dependency |
| P2 | [TASK-09](09-form-request-validation.md) | Validation consistency | ✅ Done | Bad data, scattered rules |
| P2 | [TASK-10](10-split-god-classes.md) | Oversized classes | ✅ Done | Maintainability |
| P3 | [TASK-11](11-logging-and-debug-leftovers.md) | Debug/logging leftovers, PII | ✅ Done | Log noise, PII leak |
| P3 | [TASK-12](12-no-test-suite.md) | No automated tests | ✅ Done | Regressions |
| P3 | [TASK-13](13-repo-hygiene-dead-files.md) | Dead files & repo hygiene | ✅ Done | Clutter, large repo |
| P3 | [TASK-14](14-custom-auth-facade-and-helpers.md) | Custom Auth facade & fragile helpers | ✅ Done | Surprising behavior |

## Ground rules for the executing agent

- **Do not** change behavior the frontend depends on without checking. The Angular frontend
  lives at `C:\Users\User\Documents\NEXUS\frontend` and consumes this API. Response shapes,
  query-string parameters (`with`, `append`, `index`, filter columns) and status codes are a
  contract. When a task says "tighten input handling", preserve the wire format.
- Run `vendor/bin/pint` after edits (config in `pint.json`).
- Keep PHP 8.3+ idioms (the project requires `php: ^8.3`, Laravel `^13.0`).
- Prefer small, reviewable commits per task.

## API benchmark

There is now a reusable API speed benchmark at `tests/Feature/Performance/ApiEndpointBenchmarkTest.php`.
It auto-discovers read-oriented API routes, times them against the current database, and writes a
JSON report to `storage/app/api-benchmark-report.json`.

### Run it

```powershell
vendor\bin\phpunit tests\Feature\Performance\ApiEndpointBenchmarkTest.php
```

### Useful overrides

```powershell
$env:API_BENCHMARK_ROUTE_FILTER='api/projects'
$env:API_BENCHMARK_TOP='50'
$env:API_BENCHMARK_USER_ID='4'
$env:API_BENCHMARK_COMPANY_ID='2124'
$env:API_BENCHMARK_PROJECT_TIME_ID='1225'
$env:API_BENCHMARK_PROJECT_BUDGET_ID='1515'
vendor\bin\phpunit tests\Feature\Performance\ApiEndpointBenchmarkTest.php
```

### Notes

- Non-read routes are intentionally skipped.
- WebDAV, At2 Connect, binary/icon endpoints, and API-key-only routes are intentionally skipped.
- The PHPUnit output prints the slowest executed routes, and the JSON file can be used for deeper analysis.
