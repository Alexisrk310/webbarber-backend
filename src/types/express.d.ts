// src/types/express.d.ts
import { User } from './User'; // Asegúrate de que este archivo User esté correctamente importado

declare global {
	namespace Express {
		interface User extends User {
			// Aquí extiendes la interfaz User
			role: string; // Añades la propiedad `role` para que esté disponible
			id: string;
		}

		interface Request {
			user?: User; // Agregamos la propiedad `user` con el tipo `User` que ahora tiene `role`
		}
	}
}
