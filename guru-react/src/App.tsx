import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';
import { Tournaments } from './pages/Tournaments';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    return (
        <BrowserRouter>
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
            </Routes>
        </BrowserRouter>
    );
}

export default App;
