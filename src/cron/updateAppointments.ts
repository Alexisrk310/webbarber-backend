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
		const twoHoursLater = now.add(2, 'hour');

		const pendingAppointments = await prisma.appointment.findMany({
			where: {
				status: 'pendiente',
				dateTime: {
					lte: twoHoursLater.toDate(),
					gte: now.toDate(),
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
			`✔️ [CRON] ${pendingAppointments.length} citas cambiadas a estado 'activo'`
		);
	} catch (error) {
		console.error('❌ [CRON] Error al actualizar citas:', error);
	}
});
