import express from 'express';
import './cron/updateAppointments';

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg'; // ← importante
import authRoutes from './routes/authRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import './config/passportConfig';
import errorHandler from './middleware/errorHandler';
import cors from 'cors';

const app = express();

// Configurar conexión a PostgreSQL (usada por connect-pg-simple)
const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false, // necesario para Render y otros servicios en la nube
	},
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
	cors({
		origin: process.env.FRONTEND_URL?.split(',') || '*', // admite múltiples dominios si los defines separados por comas
		credentials: true, // importante si usas cookies con sesiones
	})
);

// Sesión usando PostgreSQL
app.use(
	session({
		store: new PgSession({
			pool: pgPool,
			tableName: 'user_sessions', // puedes cambiar el nombre si quieres
		}),
		secret: process.env.JWT_SECRET || 'default_secret',
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: true, // true en producción con HTTPS
			sameSite: 'lax',
			maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
		},
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
