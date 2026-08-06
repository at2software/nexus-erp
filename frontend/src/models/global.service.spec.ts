import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '@environments/environment';
import { AuthenticationService } from '@models/auth.service';
import { GlobalService } from '@models/global.service';
import { setCookie, deleteCookie } from '@constants/cookies';

describe('GlobalService resolves authentication so the login route can render', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        AuthenticationService.sysinfo = { method: 'token', version: '1' };
        deleteCookie('api_token');
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                provideZonelessChangeDetection(),
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: APP_BASE_HREF, useValue: '/' },
            ],
        });
    });

    afterEach(() => {
        deleteCookie('api_token');
        AuthenticationService.sysinfo = undefined;
        vi.useRealTimers();
    });

    it('resolves on a cold boot with no api_token cookie', () => {
        const global = TestBed.inject(GlobalService);

        vi.advanceTimersByTime(0);

        expect(global.authResolved()).toBe(true);
        TestBed.inject(HttpTestingController).expectNone(environment.envApi + 'users/environment');
    });

    it('resolves rather than leaving a blank shell when APP_AUTH is not a mode the frontend knows', () => {
        AuthenticationService.sysinfo = { method: 'default', version: '1' };
        const global = TestBed.inject(GlobalService);

        vi.advanceTimersByTime(0);

        expect(global.authResolved()).toBe(true);
    });

    it('resolves and routes to login when the stored token is no longer valid', () => {
        setCookie('api_token', 'expired', 7);
        const global = TestBed.inject(GlobalService);
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        vi.advanceTimersByTime(0);
        TestBed.inject(HttpTestingController).expectOne(environment.envApi + 'users/environment').flush(null, { status: 401, statusText: 'Unauthorized' });

        expect(global.authResolved()).toBe(true);
        expect(navigate).toHaveBeenCalledWith(['/login']);
    });
});
