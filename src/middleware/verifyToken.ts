import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
	// Buscamos el token en los headers de la solicitud
	const token = req.headers['authorization']?.split(' ')[1]; // Se espera "Bearer <token>"

	if (!token) {
		return res
			.status(403)
			.json({ message: 'Acceso denegado, token requerido' });
	}

	// Verificar el token
	jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
		if (err) {
			return res.status(403).json({ message: 'Token no válido' });
		}

		// Si el token es válido, agregamos el user al request
		req.user = decoded as { id: string; role: string }; // Asegúrate de que el tipo coincida con tu definición de usuario
		next();
	});
};

export default verifyToken;
