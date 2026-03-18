import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { AuthGuardData, createAuthGuard } from "keycloak-angular";
import { environment } from "src/environments/environment";
import { GlobalService } from "./global.service";
import { deleteCookie, getCookie } from "src/constants/cookies";
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from "@angular/router";
import { LocationStrategy } from "@angular/common";
import { firstValueFrom } from "rxjs";
import Keycloak from 'keycloak-js';

interface TSysinfo { method: string, version: string, reverb_key?: string }

@Injectable({ providedIn: 'root' })
export class AuthenticationService {

    apiToken: string | undefined = undefined

    http = inject(HttpClient)
    router = inject(Router)
    _isLoggedIn: boolean = false
    locationStrategy = inject(LocationStrategy)

    static sysinfo?: TSysinfo
    static keycloak?:Keycloak = undefined

    isLoggedIn = (): Promise<boolean> => {
        return Promise.resolve(
            true
        );
    };

    async logout() {
        localStorage.removeItem('currentUser')
        localStorage.removeItem('token')
        if (AuthenticationService.sysinfo!.method == 'token') {
            deleteCookie('api_token')
            this.router.navigate(['/login'])
        }
        else if (AuthenticationService.sysinfo!.method == 'keycloak') {
            AuthenticationService.keycloak?.logout()
        }
    }

    checkApiKey = (apiKey: string): Promise<any> => new Promise(resolve => {

        const httpHeaders = new HttpHeaders({ 'Authorization': 'Bearer ' + apiKey })

        this.http.post(environment.envApi + 'login', {}, { headers: httpHeaders }).subscribe((response: any) => {

            if (response.api_token) {
                resolve(response)
            }
            resolve(false)
        })
    })

    static loadSysInfo = () => fetch(environment.envApi + 'sysinfo').then(async (response) => {
        AuthenticationService.sysinfo = await response.json()
        return AuthenticationService.sysinfo
    })
    static getAuthGuard = (): CanActivateFn => {
        const authMethod = AuthenticationService.sysinfo!.method;
        switch (authMethod) {
            case 'keycloak':
                return createAuthGuard<CanActivateFn>(AuthenticationService.isKeycloakAuthenticated)
            case 'token':
                return AuthenticationService.isTokenAuthenticated
        }
        return () => false
    }
    static isKeycloakAuthenticated = async (route: ActivatedRouteSnapshot, _: RouterStateSnapshot, authData: AuthGuardData): Promise<boolean | UrlTree> => {
        const global = inject(GlobalService)
        const { authenticated } = authData;
        if (authenticated) {
            AuthenticationService.keycloak = authData.keycloak
            // Initialize global environment now that Keycloak is authenticated
            await global.startKeycloakInit()
            await firstValueFrom(global.init)
            return true
        } else {
            authData.keycloak.login()
            return false
        }
    };

    static isTokenAuthenticated = async (_route: ActivatedRouteSnapshot, _: RouterStateSnapshot): Promise<boolean | UrlTree> => {
        const router = inject(Router)
        const token = getCookie('api_token')
        if (!token) return router.createUrlTree(['/login'])
        const global = inject(GlobalService)
        await firstValueFrom(global.init)
        return true
    };

}
