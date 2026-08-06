import { Dictionary } from '@constants/constants';
import { HttpHeaders } from '@angular/common/http';

export const NexusHttpInterceptor = {
    headers: {} as Dictionary<HttpHeaders>,
    add(url: string, headers: HttpHeaders) {
        NexusHttpInterceptor.headers[url] = headers;
    },
};
