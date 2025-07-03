// src/routes/authRoutes.ts
import express, { Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { googleLogin, loginUser, registerUser } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Ruta de registro
router.post('/register', registerUser);
router.post('/login', loginUser);
// Ruta para login con Google
router.post('/google-login', googleLogin);
router.get('/protected-route', protect, (req, res) => {
	// Si llegamos aquí, significa que el token fue verificado con éxito
	// y la información del usuario está disponible en `req.user`
	res.json({ message: 'Acceso autorizado', user: req.user });
});

// Callback de Google OAuth
// src/routes/authRoutes.ts

export default router;
