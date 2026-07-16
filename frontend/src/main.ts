import 'reflect-metadata';
import { ApplicationConfig, EnvironmentProviders, ErrorHandler, inject, LOCALE_ID, Provider, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from '@app/app/app.component';
import { APP_BASE_HREF, PlatformLocation, registerLocaleData } from '@angular/common';
import { HttpFeature, HttpFeatureKind, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from './app/_modals/modal-confirm/confirmation.service';
import { nexusHttpInterceptor } from '@app/http.interceptor';
import { NxService } from '@app/nx/nx.service';
import { RouteChangeListenerService } from '@app/routeChangeListener.service';
import { GlobalService } from '@models/global.service';
import { AuthenticationService } from '@models/auth.service';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { PermissionsGuard } from '@guards/permissions.guard';
import { routes } from './app/app.routes';
import { LocaleService, LOCALE_CONFIG } from 'ngx-daterangepicker-material';
import { ChunkErrorHandler } from '@constants/ChunkErrorHandler';
import { provideEchartsCore } from 'ngx-echarts';
import localeDe from '@angular/common/locales/de';
import './app/custom-interfaces';
import { MODEL_REGISTRY } from '@constants/model-registry';
import { MODEL_REGISTRY_TOKEN } from '@constants/model-registry.token';

registerLocaleData(localeDe);

AuthenticationService.loadSysInfo().then(async (sysinfo) => {
    if (sysinfo) {
        let keycloakHttpOptions: HttpFeature<HttpFeatureKind>[] = [];
        let keycloakProviders: (Provider | EnvironmentProviders)[] = [];
        if (sysinfo.method === 'keycloak') {
            const [{ includeBearerTokenInterceptor }, { KeycloakHandler }] = await Promise.all([import('keycloak-angular'), import('@models/http/keycloak')]);
            keycloakHttpOptions = [withInterceptors([includeBearerTokenInterceptor])];
            keycloakProviders = KeycloakHandler.provideKeycloak();
        }

        const appConfig: ApplicationConfig = {
            providers: [
                provideZonelessChangeDetection(),
                { provide: MODEL_REGISTRY_TOKEN, useFactory: () => MODEL_REGISTRY },
                NxService,
                GlobalService,
                ConfirmationService,
                AuthenticationService,
                ModalBaseService,
                PermissionsGuard,
                LocaleService,

                provideHttpClient(...keycloakHttpOptions, withInterceptors([nexusHttpInterceptor])),
                { provide: LOCALE_CONFIG, useValue: { format: 'DD.MM.YYYY' } },
                { provide: ErrorHandler, useClass: ChunkErrorHandler },
                { provide: APP_BASE_HREF, useFactory: (s: PlatformLocation) => s.getBaseHrefFromDOM(), deps: [PlatformLocation] },
                { provide: LOCALE_ID, deps: [GlobalService], useFactory: (g: GlobalService) => g.locale },
                provideEchartsCore({ echarts: () => import('echarts') }),

                provideRouter(routes()),
                provideAppInitializer(() => { inject(RouteChangeListenerService); }),
                ...keycloakProviders,
            ],
        };

        bootstrapApplication(AppComponent, appConfig)
            .then(() => {
                const splash = document.getElementById('splash-screen');
                if (splash) {
                    splash.classList.add('fade-out');
                    setTimeout(() => {
                        splash.remove();
                    }, 500); // matches the transition duration
                }
            })
            .catch((err) => console.error(err));
    }
});
