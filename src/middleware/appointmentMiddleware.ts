import { Request, Response, NextFunction } from 'express';
import { appointmentConfig } from '../config/appointmentConfig';
import { utcToZonedTime } from 'date-fns-tz';
import { getHours, isValid } from 'date-fns';

const timeZone = 'America/Bogota';

const isWeekend = (date: Date): boolean => {
	const day = date.getDay();
	return day === 6 || day === 0;
};

const isHoliday = (date: Date): boolean => {
	const formattedDate = date.toISOString().split('T')[0];
	return appointmentConfig.holidays.includes(formattedDate);
};

export const checkAvailability = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const { dateTime } = req.body;

	if (!dateTime) {
		res.status(400).json({ message: 'La fecha y hora son requeridas' });
		return;
	}

	const utcDate = new Date(dateTime);
	if (!isValid(utcDate)) {
		res.status(400).json({ message: 'Formato de fecha no válido' });
		return;
	}

	const localDate = utcToZonedTime(utcDate, timeZone);
	const localHour = getHours(localDate);

	if (
		localHour < appointmentConfig.workingHours.start ||
		localHour >= appointmentConfig.workingHours.end
	) {
		res.status(400).json({
			message:
				'La hora solicitada no está dentro del horario laboral (8am a 5pm hora Colombia)',
		});
		return;
	}

	if (!appointmentConfig.weekendsEnabled && isWeekend(localDate)) {
		res.status(400).json({ message: 'Los fines de semana están desactivados' });
		return;
	}

	if (isHoliday(localDate)) {
		res
			.status(400)
			.json({ message: 'No se pueden hacer citas en días festivos' });
		return;
	}

	next();
};
