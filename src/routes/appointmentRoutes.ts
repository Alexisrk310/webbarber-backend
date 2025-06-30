import { Router } from 'express';
import {
	createAppointment,
	getUserAppointments,
	getAllAppointments,
} from '../controllers/appointmentController';
import { protect, isAdmin } from '../middleware/authMiddleware';

const router = Router();

// Ruta protegida para ver todas las citas de un usuario
router.get('/appointments', protect, getUserAppointments);

// Ruta protegida para agregar una nueva cita
router.post('/appointments', protect, createAppointment);

// Ruta protegida para ver todas las citas de todos los usuarios (solo admin)
router.get('/appointments/all', protect, isAdmin, getAllAppointments);

export default router;
