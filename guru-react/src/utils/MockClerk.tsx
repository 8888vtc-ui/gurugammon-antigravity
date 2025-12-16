import React, { useEffect } from 'react';

// Use a shared state for the token so it persists across renders
let globalToken: string | null = null;
const observers = new Set<(token: string | null) => void>();

const fetchGuestToken = async () => {
    if (globalToken) return;
    try {
        const res = await fetch('/api/auth/guest-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success && data.data.token) {
            console.log("MockClerk: Acquired Guest Token", data.data.token);
            globalToken = data.data.token;
            localStorage.setItem('token', globalToken || '');
            observers.forEach(cb => cb(globalToken));
        }
    } catch (e) {
        console.error("MockClerk: Failed to get guest token", e);
    }
};

// Initialize token fetch
fetchGuestToken();

export const ClerkProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};

export const useUser = () => {
    const [token, setToken] = React.useState(globalToken);

    useEffect(() => {
        const handler = (t: string | null) => setToken(t);
        observers.add(handler);
        return () => { observers.delete(handler); };
    }, []);

    return {
        isSignedIn: !!token,
        user: {
            id: 'guest-user-id',
            username: 'GuestUser',
            primaryEmailAddress: { emailAddress: 'guest@example.com' },
            fullName: 'Guest User'
        },
        isLoaded: true
    };
};

export const useAuth = () => {
    const [token, setToken] = React.useState(globalToken);

    useEffect(() => {
        const handler = (t: string | null) => setToken(t);
        observers.add(handler);
        if (!globalToken) fetchGuestToken();
        return () => { observers.delete(handler); };
    }, []);

    return {
        getToken: async () => token || 'waiting-for-token',
        userId: 'guest-user-id',
        sessionId: 'guest-session-id'
    };
};

export const SignIn = () => {
    return <div>Signing in as Guest...</div>;
};

export const SignedIn = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const SignedOut = ({ children }: { children: React.ReactNode }) => null;
