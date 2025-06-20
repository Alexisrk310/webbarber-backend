// src/types/express.d.ts
import { User } from './User'; // Asegúrate de importar tu tipo `User` desde donde lo hayas definido

declare global {
	namespace Express {
		interface User extends User {} // Ahora Express.User tendrá las propiedades de tu tipo `User`
		interface Request {
			user?: User; // El tipo `user` será el de tu modelo `User`
		}
	}
}
