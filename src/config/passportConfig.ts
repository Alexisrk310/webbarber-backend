import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../types/User'; // Importa el tipo `User`
import prisma from './prisma';

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			callbackURL: process.env.FRONTEND_GOOOLE_URL,
			scope: ['email', 'profile'],
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				// Creamos un usuario personalizado a partir de los datos de Google
				const user: User = {
					id: profile.id,
					name: profile.displayName,
					email: profile.emails?.[0].value || '', // Si no hay email, lo dejamos vacío
					googleId: profile.id,
					role: 'user', // Aquí está el cambio: usamos `role` en lugar de `rol`

					createdAt: new Date(),
					updatedAt: new Date(),
				};

				// Pasamos el usuario a la siguiente función
				return done(null, user); // Aquí pasamos el `user` de tipo `User` a `done`
			} catch (error) {
				return done(error, false);
			}
		}
	)
);

// Serialización y deserialización con Passport
passport.serializeUser((user: any, done) => done(null, user.id)); // Asegúrate de que `user` es de tipo `User`
passport.deserializeUser((id: string, done) => {
	// Aquí deberías buscar al usuario en la base de datos usando el `id` que se pasa
	prisma.user
		.findUnique({ where: { id } }) // Encuentra al usuario en la base de datos
		.then((user: any) => {
			// Si el usuario es encontrado, lo pasamos a done
			if (user) {
				const expressUser = {
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role, // Asegúrate de que 'role' esté aquí
					gender: user.gender, // Añade gender también si es necesario
				};
				done(null, expressUser); // Ahora estamos pasando un objeto de tipo User
			} else {
				done(null, false); // Si no se encuentra el usuario, devolvemos 'false'
			}
		})
		.catch((error: any) => {
			done(error, false); // Manejo de errores
		});
});
