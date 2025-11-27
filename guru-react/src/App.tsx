import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';
import { Profile } from './pages/Profile';
import { AdminPanel } from './pages/Admin';
import { MobileNav } from './components/layout/MobileNav';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('SW registered: ', registration);
                }).catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
            });
        }
    }, []);

    return (
        <ErrorBoundary>
            <BrowserRouter>
                <div className="pb-16 md:pb-0"> {/* Padding for mobile nav */}
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/lobby" element={
                            <PrivateRoute>
                                <Lobby />
                            </PrivateRoute>
                        } />
                        <Route path="/game/:id" element={
                            <PrivateRoute>
                                <Game />
                            </PrivateRoute>
                        } />
                        <Route path="/tournaments" element={
                            <PrivateRoute>
                                <Tournaments />
                            </PrivateRoute>
                        } />
                        <Route path="/tournaments/:id" element={
                            <PrivateRoute>
                                <TournamentDetail />
                            </PrivateRoute>
                        } />
                        <Route path="/profile" element={
                            <PrivateRoute>
                                <Profile />
                            </PrivateRoute>
                        } />
                        <Route path="/admin" element={
                            <PrivateRoute>
                                <AdminPanel />
                            </PrivateRoute>
                        } />
                    </Routes>
                    <MobileNav />
                </div>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
