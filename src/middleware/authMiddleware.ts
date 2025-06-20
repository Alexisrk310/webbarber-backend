import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Middleware para verificar el JWT
export const protect = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	// Obtiene el token del encabezado Authorization
	const token = req.header('Authorization')?.replace('Bearer ', '');

	// Si no se encuentra el token
	if (!token) {
		res.status(401).json({ message: 'No se proporcionó token' });
		return;
	}

	try {
		// Verifica y decodifica el JWT
		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
			userId: string;
		};

		// Agrega el usuario decodificado a la solicitud (req.user)
		req.user = decoded; // Puedes agregar más propiedades si es necesario

		// Continúa al siguiente middleware o ruta
		next();
	} catch (error) {
		res.status(401).json({ message: 'Token inválido' });
		return;
	}
};
