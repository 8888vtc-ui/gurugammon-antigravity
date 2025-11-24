// src/routes/user.ts
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getProfile, updateProfile } from '../controllers/userController';
import { getDashboard } from '../controllers/userDashboardController';

const router = express.Router();

// Toutes les routes utilisateur nécessitent une authentification
router.use(authMiddleware);

// GET /api/user/profile - Obtenir son profil
router.get('/profile', getProfile);

// PUT /api/user/profile - Mettre à jour son profil
router.put('/profile', updateProfile);

// GET /api/user/dashboard - Tableau de bord complet
router.get('/dashboard', getDashboard);

export default router;
