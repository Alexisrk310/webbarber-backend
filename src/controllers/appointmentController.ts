import { Request, Response } from 'express';
import prisma from '../config/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isoWeek from 'dayjs/plugin/isoWeek';
import { ALLOWED_SERVICES } from '../constants/services';

const TIME_ZONE = 'America/Bogota';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

const isHourWithinWorkingHours = (date: Date) => {
	const zoned = dayjs(date).tz(TIME_ZONE);
	const hour = zoned.hour();
	return hour >= 8 && hour < 17;
};

export const getUserAppointments = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(400).json({ message: 'Usuario no autenticado' });
			return;
		}

		const appointments = await prisma.appointment.findMany({
			where: { userId },
			orderBy: { dateTime: 'desc' }, // fechas más recientes primero
		});

		// Ordenar por estado y luego por fecha (descendente)
		const ordered = appointments.sort((a, b) => {
			const statusOrder = (status: string) => {
				if (status === 'pendiente') return 0;
				if (status === 'en_curso') return 1;
				if (status === 'activo') return 2;
				if (status === 'completado') return 3;
				return 4;
			};

			const statusDiff = statusOrder(a.status) - statusOrder(b.status);
			if (statusDiff !== 0) return statusDiff;

			// Ordenar por fecha descendente
			return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
		});

		res.status(200).json({ appointments: ordered });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ message: 'Error al obtener las citas del usuario', error });
	}
};

export const createAppointment = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { dateTime, gender, name, service } = req.body;
		const userId = req.user?.id;
		if (!dateTime || !gender || !userId || !service) {
			res.status(400).json({ message: 'Datos incompletos para la cita' });
			return;
		}
		if (!ALLOWED_SERVICES.includes(service)) {
			res.status(400).json({ message: 'Servicio no permitido' });
			return;
		}
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { name: true },
		});
		if (!user) {
			res.status(404).json({ message: 'Usuario no encontrado' });
			return;
		}
		const finalName = name?.trim() || user.name;
		const appointmentDate = dayjs(dateTime).toDate();
		if (!dayjs(appointmentDate).isValid()) {
			res.status(400).json({ message: 'Formato de fecha no válido' });
			return;
		}
		if (!isHourWithinWorkingHours(appointmentDate)) {
			res.status(400).json({
				message: 'La cita debe estar entre 8am y 5pm (hora Colombia)',
			});
			return;
		}
		const existingAppointment = await prisma.appointment.findFirst({
			where: { dateTime: appointmentDate },
		});
		if (existingAppointment) {
			res
				.status(400)
				.json({ message: 'Ya existe una cita agendada para esa fecha y hora' });
			return;
		}
		const newAppointment = await prisma.appointment.create({
			data: {
				userId,
				name: finalName,
				dateTime: appointmentDate,
				status: 'pendiente',
				gender,
				service,
			},
			include: { user: { select: { name: true, email: true } } },
		});
		res.status(201).json({
			message: 'Cita agendada correctamente',
			appointment: newAppointment,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al agendar la cita', error });
	}
};

export const updateOwnAppointment = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.id;
		const appointmentId = Number(req.params.id);
		const { dateTime, gender, name, service } = req.body;
		if (!userId || isNaN(appointmentId)) {
			res.status(400).json({ message: 'ID inválido' });
			return;
		}
		if (!dateTime || !gender || !service) {
			res
				.status(400)
				.json({ message: 'Datos incompletos para actualizar la cita' });
			return;
		}
		if (!ALLOWED_SERVICES.includes(service)) {
			res.status(400).json({ message: 'Servicio no permitido' });
			return;
		}
		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
		});
		if (!appointment || appointment.userId !== userId) {
			res
				.status(403)
				.json({ message: 'No tienes permisos para editar esta cita' });
			return;
		}
		const finalName = name?.trim() || appointment.name;
		const appointmentDate = dayjs(dateTime).toDate();
		if (!dayjs(appointmentDate).isValid()) {
			res.status(400).json({ message: 'Formato de fecha no válido' });
			return;
		}
		if (!isHourWithinWorkingHours(appointmentDate)) {
			res.status(400).json({
				message: 'La cita debe estar entre 8am y 5pm (hora Colombia)',
			});
			return;
		}
		const conflictingAppointment = await prisma.appointment.findFirst({
			where: { dateTime: appointmentDate, id: { not: appointmentId } },
		});
		if (conflictingAppointment) {
			res.status(400).json({
				message: 'Ya existe otra cita agendada para esa fecha y hora',
			});
			return;
		}
		const updatedAppointment = await prisma.appointment.update({
			where: { id: appointmentId },
			data: { dateTime: appointmentDate, gender, name: finalName, service },
		});
		res.status(200).json({
			message: 'Cita actualizada correctamente',
			appointment: updatedAppointment,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al actualizar la cita', error });
	}
};

// Eliminar cita del propio usuario
export const deleteOwnAppointment = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.id;
		const appointmentId = Number(req.params.id);

		if (!userId || isNaN(appointmentId)) {
			res.status(400).json({ message: 'ID inválido' });
			return;
		}

		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
		});

		if (!appointment || appointment.userId !== userId) {
			res
				.status(403)
				.json({ message: 'No tienes permisos para eliminar esta cita' });
			return;
		}

		await prisma.appointment.delete({
			where: { id: appointmentId },
		});

		res.status(200).json({ message: 'Cita eliminada correctamente' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al eliminar la cita', error });
	}
};

// Ver todas las citas (admin)
export const getAllAppointments = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userRole = req.user?.role;

		if (userRole !== 'admin') {
			res
				.status(403)
				.json({ message: 'No tienes permisos para ver todas las citas' });
			return;
		}

		const appointments = await prisma.appointment.findMany({
			orderBy: { dateTime: 'desc' }, // fecha más reciente primero
			include: {
				user: {
					select: {
						name: true,
						email: true,
						role: true,
					},
				},
			},
		});

		// Reordenar por estado y fecha (fecha descendente)
		const ordered = appointments.sort((a, b) => {
			const statusOrder = (status: string) => {
				if (status === 'pendiente') return 0;
				if (status === 'en_curso') return 1;
				if (status === 'activo') return 2;
				if (status === 'completado') return 3;
				return 4;
			};

			const statusDiff = statusOrder(a.status) - statusOrder(b.status);
			if (statusDiff !== 0) return statusDiff;

			// Fecha descendente (más reciente primero)
			return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
		});

		res.status(200).json({ appointments: ordered });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ message: 'Error al obtener todas las citas', error });
	}
};

// Actualizar cita (admin)
export const adminUpdateAppointment = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userRole = req.user?.role;
		const appointmentId = Number(req.params.id);
		const { dateTime, gender, name, service, status } = req.body;

		if (userRole !== 'admin') {
			res.status(403).json({ message: 'Acceso denegado: solo admins' });
			return;
		}

		if (!dateTime || !gender || !service || !status) {
			res
				.status(400)
				.json({ message: 'Datos incompletos para actualizar la cita' });
			return;
		}

		if (!ALLOWED_SERVICES.includes(service)) {
			res.status(400).json({ message: 'Servicio no permitido' });
			return;
		}

		const appointmentDate = dayjs(dateTime).toDate();
		if (!dayjs(appointmentDate).isValid()) {
			res.status(400).json({ message: 'Formato de fecha no válido' });
			return;
		}

		if (!isHourWithinWorkingHours(appointmentDate)) {
			res.status(400).json({
				message: 'La cita debe estar entre 8am y 5pm (hora Colombia)',
			});
			return;
		}

		const conflictingAppointment = await prisma.appointment.findFirst({
			where: {
				dateTime: appointmentDate,
				id: { not: appointmentId },
			},
		});

		if (conflictingAppointment) {
			res.status(400).json({
				message: 'Ya existe otra cita agendada para esa fecha y hora',
			});
			return;
		}

		const updatedAppointment = await prisma.appointment.update({
			where: { id: appointmentId },
			data: {
				dateTime: appointmentDate,
				gender,
				name: name?.trim(),
				service,
				status,
			},
		});

		res.status(200).json({
			message: 'Cita actualizada por el administrador',
			appointment: updatedAppointment,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al actualizar la cita', error });
	}
};

export const getAppointmentStats = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userRole = req.user?.role;
		if (userRole !== 'admin') {
			res.status(403).json({ message: 'Acceso denegado: solo admins' });
			return;
		}

		const startToday = dayjs().tz(TIME_ZONE).startOf('day').toDate();
		const endToday = dayjs().tz(TIME_ZONE).endOf('day').toDate();
		const startWeek = dayjs().tz(TIME_ZONE).startOf('isoWeek').toDate();
		const endWeek = dayjs().tz(TIME_ZONE).endOf('isoWeek').toDate();

		const [
			todayAppointments,
			weekAppointments,
			activeClients,
			todayAppointmentsList,
		] = await Promise.all([
			prisma.appointment.count({
				where: {
					dateTime: {
						gte: startToday,
						lte: endToday,
					},
				},
			}),
			prisma.appointment.count({
				where: {
					dateTime: {
						gte: startWeek,
						lte: endWeek,
					},
				},
			}),
			prisma.appointment.findMany({
				where: {
					status: {
						in: ['pendiente', 'en_curso', 'activo'],
					},
				},
				select: {
					userId: true,
				},
				distinct: ['userId'],
			}),
			prisma.appointment.findMany({
				where: {
					dateTime: {
						gte: startToday,
						lte: endToday,
					},
				},
				orderBy: {
					dateTime: 'desc', // para que luego el sort no tenga que invertir
				},
			}),
		]);

		// Reordenar por estado y luego por fecha descendente
		const orderedAppointments = todayAppointmentsList.sort((a, b) => {
			const statusOrder = (status: string) => {
				if (status === 'pendiente') return 0;
				if (status === 'en_curso') return 1;
				if (status === 'activo') return 2;
				if (status === 'completado') return 3;
				return 4;
			};

			const statusDiff = statusOrder(a.status) - statusOrder(b.status);
			if (statusDiff !== 0) return statusDiff;

			// Fecha descendente (más reciente primero)
			return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
		});

		res.status(200).json({
			todayAppointments,
			weekAppointments,
			activeClientsCount: activeClients.length,
			todayAppointmentsList: orderedAppointments,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: 'Error al obtener estadísticas de las citas',
			error,
		});
	}
};

// Eliminar cita (admin)
export const adminDeleteAppointment = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userRole = req.user?.role;
		const appointmentId = Number(req.params.id);

		if (userRole !== 'admin') {
			res.status(403).json({ message: 'Acceso denegado: solo admins' });
			return;
		}

		if (isNaN(appointmentId)) {
			res.status(400).json({ message: 'ID de cita inválido' });
			return;
		}

		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
		});

		if (!appointment) {
			res.status(404).json({ message: 'Cita no encontrada' });
			return;
		}

		await prisma.appointment.delete({
			where: { id: appointmentId },
		});

		res.status(200).json({ message: 'Cita eliminada por el administrador' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al eliminar la cita', error });
	}
};
