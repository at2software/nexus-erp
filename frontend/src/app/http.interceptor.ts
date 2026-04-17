import { HttpInterceptorFn, HttpHeaders } from '@angular/common/http';

export const NexusHttpInterceptor = {
    headers: {} as Record<string, HttpHeaders>,
    add(url: string, headers: HttpHeaders) {
        NexusHttpInterceptor.headers[url] = headers
    }
}

export const nexusHttpInterceptor: HttpInterceptorFn = (req, next) => {
    for (const url of Object.keys(NexusHttpInterceptor.headers)) {
        if (req.url.startsWith(url)) {
            return next(req.clone({ headers: NexusHttpInterceptor.headers[url] }))
        }
    }
    return next(req)
}
