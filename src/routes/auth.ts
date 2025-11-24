// src/routes/auth.ts
import express from 'express';
import { register, login, logout, refreshToken } from '../controllers/authController';

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

export default router;
