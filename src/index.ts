import express from 'express';
import './cron/updateAppointments';
import passport from 'passport';
import session from 'express-session';
import authRoutes from './routes/authRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import './config/passportConfig'; // Importamos la configuración de Passport
import errorHandler from './middleware/errorHandler'; // Importamos el middleware de error
import cors from 'cors';
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
	cors({
		origin: '*',
	})
);
// Sesión
app.use(
	session({
		secret: process.env.JWT_SECRET!,
		resave: false,
		saveUninitialized: false,
	})
);

// Inicialización de Passport
app.use(passport.initialize());
app.use(passport.session());

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
