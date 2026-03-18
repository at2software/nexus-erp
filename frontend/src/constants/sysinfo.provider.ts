import { inject, provideAppInitializer } from "@angular/core";
import { AuthenticationService } from "src/models/auth.service";

// Create a simplified app initializer that only handles auth initialization
// The sysinfo call is now handled during bootstrap in main.ts
export const AuthInitProvider = provideAppInitializer(() => {
    const initializerFn = ((auth: AuthenticationService) => {
        return async () => {
            // Get the auth method from a global variable set during bootstrap
            const authMethod = (window as any).__authMethod || 'token';
            return await auth.init(authMethod);
        }
    })(inject(AuthenticationService));
    return initializerFn();
})