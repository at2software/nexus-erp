import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { deleteCookie } from '@constants/cookies';
import { NexusHttpInterceptor } from '@models/http/http-headers';
import { AuthenticationService } from '@models/auth.service';

export { NexusHttpInterceptor };

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
                if (AuthenticationService.sysinfo?.method === 'keycloak' && AuthenticationService.keycloak) {
                    AuthenticationService.keycloak.login();
                } else {
                    deleteCookie('api_token');
                    router.navigate(['/login']);
                }
            }
            return throwError(() => err);
        }),
    );
};
