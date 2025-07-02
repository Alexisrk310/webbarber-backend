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
		const userId = req.user?.id; // Obtener el id del usuario de la solicitud

		if (!userId) {
			res.status(400).json({ message: 'Usuario no autenticado' });
			return;
		}

		// Buscar todas las citas del usuario
		const appointments = await prisma.appointment.findMany({
			where: {
				userId: userId,
			},
			orderBy: {
				dateTime: 'asc', // Ordenar por hora de la cita
			},
		});

		res.status(200).json({ appointments });
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

		// Validar servicio
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
		const appointmentDate = parse(dateTime, 'dd/MM/yyyy HH:mm', new Date());

		if (!isValid(appointmentDate)) {
			res.status(400).json({ message: 'Formato de fecha no válido' });
			return;
		}

		const startHour = getHours(appointmentDate);
		if (startHour < 8 || startHour >= 17) {
			res.status(400).json({ message: 'La cita debe estar entre 8am y 5pm' });
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
		const appointmentDate = parse(dateTime, 'dd/MM/yyyy HH:mm', new Date());

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

// El usuario autenticado puede eliminar solo sus propias citas
export const deleteOwnAppointment = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.id;
		const appointmentId = Number(req.params.id); // desde la URL: /appointments/:id

		if (!userId || isNaN(appointmentId)) {
			res.status(400).json({ message: 'ID inválido' });
			return;
		}

		// Verificar si la cita pertenece al usuario
		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
		});

		if (!appointment || appointment.userId !== userId) {
			res
				.status(403)
				.json({ message: 'No tienes permisos para eliminar esta cita' });
			return;
		}

		// Eliminar la cita
		await prisma.appointment.delete({
			where: { id: appointmentId },
		});

		res.status(200).json({ message: 'Cita eliminada correctamente' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al eliminar la cita', error });
	}
};

// Ruta para ver todas las citas de todos los usuarios (solo admin)
export const getAllAppointments = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userRole = req.user?.role; // Obtener el rol del usuario desde el token

		// Solo permitir a los usuarios con rol de 'admin' acceder
		if (userRole !== 'admin') {
			res
				.status(403)
				.json({ message: 'No tienes permisos para ver todas las citas' });
			return;
		}

		const appointments = await prisma.appointment.findMany({
			orderBy: {
				dateTime: 'asc', // Ordenar por hora de la cita
			},
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

		const appointmentDate = parse(dateTime, 'dd/MM/yyyy HH:mm', new Date());
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

// Solo los administradores pueden eliminar cualquier cita
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

		// Verificar si la cita existe
		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
		});

		if (!appointment) {
			res.status(404).json({ message: 'Cita no encontrada' });
			return;
		}

		// Eliminar la cita
		await prisma.appointment.delete({
			where: { id: appointmentId },
		});

		res.status(200).json({ message: 'Cita eliminada por el administrador' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al eliminar la cita', error });
	}
};
