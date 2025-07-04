import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { parse, isValid, getHours } from 'date-fns';
import { ALLOWED_SERVICES } from '../constants/services';

// Ruta para ver todas las citas de un usuario
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
			orderBy: { dateTime: 'asc' },
		});

		res.status(200).json({ appointments });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ message: 'Error al obtener las citas del usuario', error });
	}
};

// Crear cita
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
		const appointmentDate = new Date(dateTime);

		if (!isValid(appointmentDate)) {
			res.status(400).json({ message: 'Formato de fecha no válido' });
			return;
		}

		const startHour = getHours(appointmentDate);
		if (startHour < 8 || startHour >= 17) {
			res.status(400).json({ message: 'La cita debe estar entre 8am y 5pm' });
			return;
		}

		// Verificar que no exista cita a esa misma hora
		const existingAppointment = await prisma.appointment.findFirst({
			where: { dateTime: appointmentDate },
		});

		if (existingAppointment) {
			res.status(400).json({
				message: 'Ya existe una cita agendada para esa fecha y hora',
			});
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
			include: {
				user: {
					select: {
						name: true,
						email: true,
					},
				},
			},
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

// Actualizar cita (usuario dueño)
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
		const appointmentDate = new Date(dateTime);

		if (!isValid(appointmentDate)) {
			res.status(400).json({ message: 'Formato de fecha no válido' });
			return;
		}

		const hour = getHours(appointmentDate);
		if (hour < 8 || hour >= 17) {
			res
				.status(400)
				.json({ message: 'La cita debe estar entre las 8am y las 5pm' });
			return;
		}

		// Verificar si ya hay otra cita en esa misma fecha y hora
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
				name: finalName,
				service,
			},
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

export const getAllScheduledDates = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ message: 'Usuario no autenticado' });
			return;
		}

		const appointments = await prisma.appointment.findMany({
			select: {
				id: true,
				dateTime: true,
			},
			orderBy: {
				dateTime: 'asc',
			},
		});

		const formatted = appointments.map((app) => ({
			id: app.id,
			date: app.dateTime.toISOString().split('T')[0], // formato YYYY-MM-DD
			time: app.dateTime.toTimeString().split(' ')[0], // formato HH:MM:SS
		}));

		res.status(200).json({ scheduled: formatted });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ message: 'Error al obtener las fechas de citas', error });
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
			orderBy: { dateTime: 'asc' },
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

		res.status(200).json({ appointments });
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

		const appointmentDate = new Date(dateTime);

		if (!isValid(appointmentDate)) {
			res.status(400).json({ message: 'Formato de fecha no válido' });
			return;
		}

		const hour = getHours(appointmentDate);
		if (hour < 8 || hour >= 17) {
			res
				.status(400)
				.json({ message: 'La cita debe estar entre las 8am y las 5pm' });
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
