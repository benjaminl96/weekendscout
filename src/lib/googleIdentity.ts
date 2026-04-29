import { CALENDAR_READONLY_SCOPE } from './googleCalendar';

const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type TokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => TokenClient;
          revoke: (accessToken: string, done?: () => void) => void;
        };
      };
    };
  }
}

let identityScriptPromise: Promise<void> | undefined;

export function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (!identityScriptPromise) {
    identityScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Google sign-in failed to load.')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google sign-in failed to load.'));
      document.head.appendChild(script);
    });
  }

  return identityScriptPromise;
}

export async function requestCalendarAccess(clientId: string) {
  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_READONLY_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description ?? response.error ?? 'Google authorization failed.'));
          return;
        }

        resolve(response.access_token);
      },
    });

    if (!tokenClient) {
      reject(new Error('Google sign-in is unavailable.'));
      return;
    }

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export function revokeCalendarAccess(accessToken: string) {
  window.google?.accounts.oauth2.revoke(accessToken);
}
