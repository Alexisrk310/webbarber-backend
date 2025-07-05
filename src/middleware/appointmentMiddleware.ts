// src/middleware/appointmentMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { appointmentConfig } from '../config/appointmentConfig';

// Función para verificar si es fin de semana
const isWeekend = (date: Date): boolean => {
	const day = date.getDay();
	return day === 6 || day === 0; // 6: Sábado, 0: Domingo
};

// Función para verificar si es un día festivo
const isHoliday = (date: Date): boolean => {
	const formattedDate = date.toISOString().split('T')[0]; // Formato 'YYYY-MM-DD'
	return appointmentConfig.holidays.includes(formattedDate);
};

// Middleware para comprobar la disponibilidad de la cita
export const checkAvailability = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const { date, time } = req.body; // Fecha y hora solicitadas

	if (!date || !time) {
		res.status(400).json({ message: 'Fecha y hora son requeridas' });
		return; // Aquí se termina el flujo, no necesitamos llamar a next().
	}

	const requestedDate = new Date(date);
	const requestedTime = parseInt(time);

	// Verificar si la fecha está en fin de semana
	if (appointmentConfig.weekendsEnabled === false && isWeekend(requestedDate)) {
		res.status(400).json({ message: 'Los fines de semana están desactivados' });
		return;
	}

	// Verificar si la fecha es un día festivo
	if (isHoliday(requestedDate)) {
		res
			.status(400)
			.json({ message: 'No se pueden hacer citas en días festivos' });
		return;
	}

	// Verificar si la hora solicitada está dentro del horario de trabajo
	if (
		requestedTime < appointmentConfig.workingHours.start ||
		requestedTime > appointmentConfig.workingHours.end
	) {
		res.status(400).json({
			message: 'La hora solicitada no está dentro del horario de trabajo',
		});
		return;
	}

	next(); // Si todo está bien, continuamos con la solicitud
};
