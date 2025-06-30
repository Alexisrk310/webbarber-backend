import { Request, Response } from 'express';
import bcrypt from 'bcryptjs'; // Para comparar contraseñas encriptadas
import jwt from 'jsonwebtoken'; // Para generar el JWT
import prisma from '../config/prisma';

export const registerUser = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { name, email, password, googleId, id, gender, role } = req.body;

		// Verificar si el usuario ya existe
		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			res.status(400).json({ message: 'El usuario ya existe' });
			return;
		}

		// Encriptar la contraseña
		const hashedPassword = await bcrypt.hash(password, 10);

		// Crear un nuevo usuario con la contraseña encriptada
		const user = await prisma.user.create({
			data: {
				id,
				name,
				email,
				password: hashedPassword, // No guardes la contraseña en texto plano
				googleId,
				gender,
				role,
			},
		});

		// Enviar la respuesta con el nuevo usuario, pero sin la contraseña
		res.status(201).json({
			message: 'Usuario creado exitosamente',
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role === 'admin' ? 'admin' : 'user',
			},
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al registrar el usuario', error });
	}
};

// Función de login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
	const { email, password } = req.body; // Recibimos el email y la contraseña

	try {
		// 1. Buscar el usuario por el email
		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			res
				.status(400)
				.json({ message: 'Correo electrónico o contraseña incorrectos' });
			return;
		}

		// 2. Verificar si la contraseña coincide
		// Aquí hacemos una verificación de que password no sea null
		if (!user.password) {
			res.status(400).json({ message: 'Contraseña no encontrada' });
			return;
		}

		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			res
				.status(400)
				.json({ message: 'Correo electrónico o contraseña incorrectos' });
			return;
		}

		// 3. Generar el JWT
		const token = jwt.sign(
			{ userId: user.id, role: user.role },
			process.env.JWT_SECRET!,
			{
				expiresIn: '1h',
			}
		);

		// 4. Responder con el token y los datos del usuario (sin la contraseña)
		res.json({
			message: 'Inicio de sesión exitoso',
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				gender: user.gender,
				role: user.role,
			},
			token,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Error al iniciar sesión', error });
	}
};
