export interface User {
	id: string; // Asegúrate de que 'id' esté definido aquí
	name: string;
	email: string;
	gender?: 'hombre' | 'mujer' | 'otro'; // Definimos los géneros posibles
	password?: string;
	googleId?: string;
	role: 'user' | 'admin'; // Cambié 'rol' por 'role' para que coincida con Express.User
	createdAt: Date;
	updatedAt: Date;
}
