import { useCallback, useState } from 'react';

const MOCK_GOOGLE_AUTH_SESSION_KEY = 'oceaneyes_mock_google_authenticated';
const MOCK_SIGN_IN_DELAY_MS = 650;

const hasMockGoogleSession = () => {
  try {
    return sessionStorage.getItem(MOCK_GOOGLE_AUTH_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
};

export const useMockGoogleAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(hasMockGoogleSession);
  const [isLoading, setIsLoading] = useState(false);

  const signInWithGoogle = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, MOCK_SIGN_IN_DELAY_MS);
    });

    try {
      sessionStorage.setItem(MOCK_GOOGLE_AUTH_SESSION_KEY, 'true');
    } catch {
      // The in-memory state still grants access for this mounted app session.
    }

    setIsAuthenticated(true);
    setIsLoading(false);
  }, [isLoading]);

  return { isAuthenticated, isLoading, signInWithGoogle };
};

