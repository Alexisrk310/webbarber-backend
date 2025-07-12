import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

const prisma = new PrismaClient();

dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_ZONE = 'America/Bogota';

// Ejecutar cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
	try {
		const now = dayjs().tz(TIME_ZONE);

		// 🔹 Citas que deben estar "activas" (ya están comenzando)
		const appointmentsToActivate = await prisma.appointment.findMany({
			where: {
				status: 'pendiente',
				dateTime: {
					lte: now.toDate(), // ya inició
					gte: now.subtract(5, 'minutes').toDate(), // comenzó en los últimos 5 minutos
				},
			},
		});

		for (const appointment of appointmentsToActivate) {
			await prisma.appointment.update({
				where: { id: appointment.id },
				data: { status: 'activo' },
			});
		}

		// 🔸 Citas que deben ser "completadas" (ya pasaron hace más de 1h)
		const appointmentsToComplete = await prisma.appointment.findMany({
			where: {
				status: 'activo',
				dateTime: {
					lte: now.subtract(1, 'hour').toDate(), // ya pasó hace 1 hora
				},
			},
		});

		for (const appointment of appointmentsToComplete) {
			await prisma.appointment.update({
				where: { id: appointment.id },
				data: { status: 'completado' },
			});
		}

		console.log(`✔️ [CRON] ${appointmentsToActivate.length} citas activadas.`);
		console.log(
			`✔️ [CRON] ${appointmentsToComplete.length} citas completadas.`
		);
	} catch (error) {
		console.error('❌ [CRON] Error al actualizar citas:', error);
	}
});
