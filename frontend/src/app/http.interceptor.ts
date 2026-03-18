import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs';

@Injectable({ providedIn: "root" })
export class NexusHttpInterceptor implements HttpInterceptor {
    static headers: Record<string, HttpHeaders> = {}
    static add (url: string, headers: HttpHeaders) {
        NexusHttpInterceptor.headers[url] = headers
    }
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        for (const url of Object.keys(NexusHttpInterceptor.headers)) {
            if (req.url.startsWith(url)) {
                return next.handle(req.clone( { headers: NexusHttpInterceptor.headers[url] }))
            }
        }
        return next.handle(req);
    }
}