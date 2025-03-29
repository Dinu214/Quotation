import Keycloak, { KeycloakConfig } from 'keycloak-js';

const keycloakConfig: KeycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID
};

export const keycloak = new Keycloak(keycloakConfig);

export const initKeycloak = async () => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256',
      checkLoginIframe: false
    });

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(70).catch(() => {
        console.error('Failed to refresh token');
        window.location.reload();
      });
    };

    return authenticated;
  } catch (error) {
    console.error('Keycloak initialization error:', error);
    // Return false instead of throwing to handle the error gracefully
    return false;
  }
};