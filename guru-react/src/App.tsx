import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser, useAuth, SignIn } from '@clerk/clerk-react';
import { Landing } from './pages/Landing';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';
import { Profile } from './pages/Profile';
import { AdminPanel } from './pages/Admin';
import { MobileNav } from './components/layout/MobileNav';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

const API_URL = import.meta.env.VITE_API_URL || 'https://gurugammon.onrender.com';

const AuthSync = ({ children }: { children: React.ReactNode }) => {
    const { isSignedIn, user } = useUser();
    const { getToken } = useAuth();
    const [isSynced, setIsSynced] = useState(false);

    useEffect(() => {
        const sync = async () => {
            if (isSignedIn && user) {
                try {
                    const clerkToken = await getToken();
                    const res = await fetch(`${API_URL}/api/auth/clerk-login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: clerkToken,
                            email: user.primaryEmailAddress?.emailAddress,
                            username: user.username || user.fullName
                        })
                    });
                    const data = await res.json();
                    if (data.success && data.data.token) {
                        localStorage.setItem('token', data.data.token);
                    }
                } catch (e) {
                    console.error("Sync failed", e);
                } finally {
                    setIsSynced(true);
                }
            } else {
                setIsSynced(true);
            }
        };
        sync();
    }, [isSignedIn, user, getToken]);

    if (!isSynced) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-yellow-400">Syncing...</div>;
    return <>{children}</>;
};

const LoginScreen = () => {
    const [isLoading, setIsLoading] = useState(false);

    const handleGuestLogin = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/guest-login`, { method: 'POST' });
            const data = await res.json();
            if (data.success && data.data.token) {
                localStorage.setItem('token', data.data.token);
                window.location.href = '/lobby';
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-800 rounded-xl p-8 shadow-2xl border border-slate-700">
                <h1 className="text-3xl font-bold text-yellow-400 text-center mb-8">GuruGammon</h1>
                <div className="flex justify-center mb-6">
                    <SignIn forceRedirectUrl="/lobby" />
                </div>
                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-slate-600"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400">Or</span>
                    <div className="flex-grow border-t border-slate-600"></div>
                </div>
                <button
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors border border-slate-600"
                >
                    {isLoading ? 'Creating Guest Account...' : 'Play as Guest'}
                </button>
            </div>
        </div>
    );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    return (
        <ErrorBoundary>
            <AuthSync>
                <BrowserRouter>
                    <div className="pb-16 md:pb-0">
                        <Routes>
                            <Route path="/" element={<Landing />} />
                            <Route path="/login" element={<LoginScreen />} />
                            <Route path="/lobby" element={<PrivateRoute><Lobby /></PrivateRoute>} />
                            <Route path="/game/:id" element={<PrivateRoute><Game /></PrivateRoute>} />
                            <Route path="/tournaments" element={<PrivateRoute><Tournaments /></PrivateRoute>} />
                            <Route path="/tournaments/:id" element={<PrivateRoute><TournamentDetail /></PrivateRoute>} />
                            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                            <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
                        </Routes>
                        <MobileNav />
                    </div>
                </BrowserRouter>
            </AuthSync>
        </ErrorBoundary>
    );
}

export default App;
