import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '@models/user/user.service';
import { AuthenticationService } from '@models/auth.service';
import { deleteCookie, setCookie } from '@constants/cookies';
import { GlobalService } from '@models/global.service';
import { NexusHttpInterceptor } from '@app/http.interceptor';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    standalone: true,
    imports: [FormsModule],
})
export class LoginComponent implements OnInit {
    email: string = '';
    password: string = '';

    #userService = inject(UserService);
    #router = inject(Router);
    #authService = inject(AuthenticationService);
    #global = inject(GlobalService);

    isLoading = signal(false);

    ngOnInit() {
        deleteCookie('api_token');
        delete NexusHttpInterceptor.headers[environment.envApi];
    }

    canLogin = () => !this.isLoading() && this.email.length > 0 && this.password.length > 0;

    removeCircularReferences() {
        const seen = new WeakSet();
        return (key: any, value: object | null) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
            }
            return value;
        };
    }

    login() {
        if (this.canLogin()) {
            deleteCookie('api_token');
            delete NexusHttpInterceptor.headers[environment.envApi];
            this.#authService._isLoggedIn = false;
            this.#authService.apiToken = undefined;
            if (AuthenticationService.sysinfo!.method === 'token') {
                this.isLoading.set(true);
                this.#userService.login(this.email, this.password).subscribe((response: any) => {
                    this.isLoading.set(false);
                    if (!('user' in response)) return;
                    const data = response.user;
                    if (data?.id) {
                        this.#authService._isLoggedIn = true;
                        if (data.api_token && data.api_token.length) {
                            this.#authService.apiToken = data.api_token;
                            setCookie('api_token', data.api_token, 7);
                            this.#global.setTokenInterceptor(data.api_token);
                            this.#global.reload();
                        }
                        this.#router.navigate(['/dashboard']);
                    }
                });
            } else if (AuthenticationService.sysinfo!.method === 'keycloak') {
                console.trace('logout login.component');
                //this.#authService.keycloak.logout()
                // this.#userService.login(this.email, this.password).subscribe((data: any) => {
                //     if (data?.user?.id) {
                //         this.#authService._isLoggedIn = true
                //         this.#authService.apiToken = data.user.api_token
                //         setCookie('api_token', data.user.api_token, 7)
                //         this.#global.setTokenInterceptor(data.user.api_token)
                //         this.#global.setUserEnvironment(data)
                //         this.#router.navigate(['/dashboard'])
                //     }
                // })
            }
        }
    }
}
