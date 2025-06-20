import { Request, Response, NextFunction } from 'express';

const errorHandler = (
	err: any,
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	console.error(err.stack);

	// Verificamos si el error tiene un código de estado (HTTP)
	if (err.status) {
		res.status(err.status).json({ message: err.message });
	}

	// Si no, devolvemos un error genérico
	res.status(500).json({
		message: 'Algo salió mal, por favor intente nuevamente.',
	});
};

export default errorHandler;
