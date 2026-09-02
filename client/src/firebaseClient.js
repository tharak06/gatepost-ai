// Resilient Firebase Client Auth Wrapper (Crash-Proof)
export async function triggerGoogleSignIn() {
  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || window.__FIREBASE_API_KEY__;
    if (!apiKey) {
      throw new Error(
        'Google Web API Key is not set yet. Please enter your Gmail in the email field below, or add VITE_FIREBASE_API_KEY.'
      );
    }

    const firebaseConfig = {
      apiKey,
      projectId: "gatepost-ai",
      authDomain: "gatepost-ai.firebaseapp.com"
    };

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    throw err;
  }
}
