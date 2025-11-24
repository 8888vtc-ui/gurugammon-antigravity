// src/routes/gnubg.ts
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createRateLimiter } from '../middleware/rateLimiter';
import { 
  getHint, 
  evaluatePosition, 
  analyzeGame, 
  checkInstallation, 
  purchaseAnalyses, 
  getQuotaStatus 
} from '../controllers/gnubgController';

const router = express.Router();

// Toutes les routes GNUBG nécessitent une authentification et sont limitées côté serveur
router.use(authMiddleware);
router.use(createRateLimiter('gnubg'));

// POST /api/gnubg/hint - Obtenir une suggestion de mouvement
router.post('/hint', getHint);

// POST /api/gnubg/evaluate - Évaluer une position
router.post('/evaluate', evaluatePosition);

// POST /api/gnubg/analyze - Analyser une partie complète
router.post('/analyze', analyzeGame);

// POST /api/gnubg/purchase - Acheter des analyses supplémentaires
router.post('/purchase', purchaseAnalyses);

// GET /api/gnubg/quota - Obtenir le statut de quota IA
router.get('/quota', getQuotaStatus);

// GET /api/gnubg/check - Vérifier l'installation de GNUBG
router.get('/check', checkInstallation);

export default router;