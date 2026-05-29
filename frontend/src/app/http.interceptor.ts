import { HttpInterceptorFn, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const NexusHttpInterceptor = {
    headers: {} as Record<string, HttpHeaders>,
    add(url: string, headers: HttpHeaders) {
        NexusHttpInterceptor.headers[url] = headers;
    },
};

/**
 * Centralized auth/401 handling. Adds per-base-URL headers and redirects to /login
 * on unauthenticated responses. Other errors propagate untouched (HttpWrapper handles
 * user-facing toasts).
 */
export const nexusHttpInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    let request = req;
    for (const url of Object.keys(NexusHttpInterceptor.headers)) {
        if (req.url.startsWith(url)) {
            request = req.clone({ headers: NexusHttpInterceptor.headers[url] });
            break;
        }
    }
    return next(request).pipe(
        catchError((err) => {
            if (err instanceof HttpErrorResponse && err.status === 401) {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('token');
                router.navigate(['/login']);
            }
            return throwError(() => err);
        }),
    );
};
