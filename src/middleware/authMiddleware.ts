import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const protect = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const token = req.header('Authorization')?.replace('Bearer ', '');

	if (!token) {
		res.status(401).json({ message: 'No se proporcionó token' });
		return;
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
			userId: string;
			role: string;
		};

		// Añadimos `role` al objeto `user`
		req.user = { id: decoded.userId, role: decoded.role };

		next();
	} catch (error) {
		res.status(401).json({ message: 'Token inválido' });
	}
};

// Middleware para verificar si el usuario tiene rol de 'admin'
export const isAdmin = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const userRole = req.user?.role;
	console.log('User role:', userRole); // Para depuración
	if (userRole !== 'admin') {
		res.status(403).json({ message: 'Acceso denegado: requiere rol de admin' });
		return;
	}

	next();
};
