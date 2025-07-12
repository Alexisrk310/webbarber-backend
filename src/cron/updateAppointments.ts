import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

const prisma = new PrismaClient();

dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_ZONE = 'America/Bogota';

cron.schedule('*/5 * * * *', async () => {
	try {
		const now = dayjs().tz(TIME_ZONE);

		// 🔹 1. PENDIENTE → CONFIRMADO (faltan 2h o menos)
		const toConfirm = await prisma.appointment.findMany({
			where: {
				status: 'pendiente',
				dateTime: {
					lte: now.add(2, 'hours').toDate(), // faltan 2h o menos
				},
			},
		});

		for (const appt of toConfirm) {
			await prisma.appointment.update({
				where: { id: appt.id },
				data: { status: 'confirmado' },
			});
		}

		// 🔸 2. CONFIRMADO → EN_CURSO (es la hora actual o acaba de empezar)
		const toStart = await prisma.appointment.findMany({
			where: {
				status: 'confirmado',
				dateTime: {
					lte: now.toDate(),
					gte: now.subtract(5, 'minutes').toDate(), // empezó en últimos 5 min
				},
			},
		});

		for (const appt of toStart) {
			await prisma.appointment.update({
				where: { id: appt.id },
				data: { status: 'en_curso' },
			});
		}

		// 🔻 3. EN_CURSO → COMPLETADO (pasó hace más de 1h)
		const toComplete = await prisma.appointment.findMany({
			where: {
				status: 'en_curso',
				dateTime: {
					lte: now.subtract(1, 'hour').toDate(), // pasó hace 1h o más
				},
			},
		});

		for (const appt of toComplete) {
			await prisma.appointment.update({
				where: { id: appt.id },
				data: { status: 'completado' },
			});
		}

		console.log(`✔️ [CRON] ${toConfirm.length} confirmadas.`);
		console.log(`✔️ [CRON] ${toStart.length} en curso.`);
		console.log(`✔️ [CRON] ${toComplete.length} completadas.`);
	} catch (error) {
		console.error('❌ [CRON] Error al actualizar citas:', error);
	}
});
