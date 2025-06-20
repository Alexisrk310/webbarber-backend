import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../types/User'; // Importa el tipo `User`

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			callbackURL: 'http://localhost:4000/auth/google/callback',
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
	// Aquí normalmente buscarías al usuario en la base de datos
	done(null, { id }); // Devolvemos el ID del usuario
});
