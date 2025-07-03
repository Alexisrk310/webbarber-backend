import express from 'express';
import './cron/updateAppointments';
import authRoutes from './routes/authRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import errorHandler from './middleware/errorHandler';
import cors from 'cors';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
	cors({
		origin: process.env.FRONTEND_URL?.split(',') || '*',
		credentials: true,
	})
);

// Rutas
app.use('/auth', authRoutes);
app.use('/api', appointmentRoutes);

// Manejo de errores
app.use(errorHandler);

// Puerto de escucha
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
	console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
