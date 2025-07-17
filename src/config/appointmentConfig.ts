// src/config/appointmentConfig.ts
export const appointmentConfig = {
	// Horario de trabajo
	workingHours: {
		start: 8, // 8 AM
		end: 17, // 5 PM
	},

	// Si los fines de semana están habilitados (por defecto true)
	weekendsEnabled: true,

	// Lista de días festivos en formato 'YYYY-MM-DD'
	holidays: [
		'2025-12-25', // Ejemplo: Navidad
		'2025-01-01', // Ejemplo: Año Nuevo
		// Agregar más días festivos según sea necesario
	],
};
