import { KeycloakProviderConfig } from "@models/auth.service";
import { KeycloakService } from "keycloak-angular";

export function initializeKeycloak (keycloak: KeycloakService):Promise<boolean> {
    console.log(keycloak)
    return keycloak.init(KeycloakProviderConfig)
}