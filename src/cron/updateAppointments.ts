// src/cron/updateAppointments.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { isBefore, addHours } from 'date-fns';

const prisma = new PrismaClient();

// Ejecuta cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
	try {
		const now = new Date();
		const twoHoursLater = addHours(now, 2);

		// Encuentra las citas pendientes que ocurren en menos de 2 horas
		const pendingAppointments = await prisma.appointment.findMany({
			where: {
				status: 'pendiente',
				dateTime: {
					lte: twoHoursLater,
					gte: now,
				},
			},
		});

		for (const appointment of pendingAppointments) {
			await prisma.appointment.update({
				where: { id: appointment.id },
				data: { status: 'activo' },
			});
		}

		console.log(
			`✔️ [CRON] Se actualizaron ${pendingAppointments.length} citas a 'activo'`
		);
	} catch (error) {
		console.error('❌ [CRON] Error al actualizar citas:', error);
	}
});
