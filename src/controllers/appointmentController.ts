import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { parse, isValid, getHours } from 'date-fns';
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

// Ruta para agregar una nueva cita
export const createAppointment = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		// Obtener los valores de la solicitud
		const { dateTime, gender } = req.body;
		const userId = req.user?.id; // Obtener el ID del usuario autenticado

		// Verificar que los datos necesarios estén presentes
		if (!dateTime || !gender || !userId) {
			res.status(400).json({ message: 'Datos incompletos para la cita' });
			return;
		}

		// Convertir la fecha a un objeto Date usando date-fns
		const appointmentDate = parse(dateTime, 'dd/MM/yyyy HH:mm', new Date());

		// Verificar si la fecha es válida
		if (!isValid(appointmentDate)) {
			res.status(400).json({ message: 'Formato de fecha no válido' });
			return;
		}

		// Verificar si la cita está dentro del horario permitido (8am - 5pm)
		const startHour = getHours(appointmentDate);
		if (startHour < 8 || startHour >= 17) {
			res
				.status(400)
				.json({ message: 'La cita debe estar entre las 8am y las 5pm' });
			return;
		}

		// Crear la cita en la base de datos
		const newAppointment = await prisma.appointment.create({
			data: {
				userId: userId, // Usamos el userId
				dateTime: appointmentDate,
				status: 'pendiente', // La cita está pendiente por defecto
				gender: gender, // Guardamos el género
			},
		});

		// Responder con el éxito de la creación
		res.status(201).json({
			message: 'Cita agendada correctamente',
			appointment: newAppointment,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al agendar la cita', error });
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
