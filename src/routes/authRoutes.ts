// src/routes/authRoutes.ts
import express, { Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { loginUser, registerUser } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Ruta de registro
router.post('/register', registerUser);
router.post('/login', loginUser);
// Ruta para login con Google
router.get(
	'/google',
	passport.authenticate('google', { scope: ['email', 'profile'] })
);
router.get('/protected-route', protect, (req, res) => {
	// Si llegamos aquí, significa que el token fue verificado con éxito
	// y la información del usuario está disponible en `req.user`
	res.json({ message: 'Acceso autorizado', user: req.user });
});

// Callback de Google OAuth
// src/routes/authRoutes.ts
router.get(
	'/google/callback',
	passport.authenticate('google', { failureRedirect: '/' }),
	(req: Request, res: Response): void => {
		if (req.user) {
			const token = jwt.sign(
				{ userId: (req.user as any).id },
				process.env.JWT_SECRET!,
				{
					expiresIn: '1h',
				}
			);
			res.json({ user: req.user, token });
		} else {
			res.status(401).json({ message: 'Unauthorized' });
		}
	}
);

export default router;
