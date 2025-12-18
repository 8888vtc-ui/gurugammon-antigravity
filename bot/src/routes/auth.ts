// src/routes/auth.ts
import express from 'express';
import { register, login, logout, refreshToken, clerkLogin, guestLogin } from '../controllers/authController';

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

// POST /api/auth/clerk-login
router.post('/clerk-login', clerkLogin);

// POST /api/auth/guest-login
router.post('/guest-login', guestLogin);

export default router;
