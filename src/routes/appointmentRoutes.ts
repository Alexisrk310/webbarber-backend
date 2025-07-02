import { Router } from 'express';
import {
	createAppointment,
	getUserAppointments,
	getAllAppointments,
	deleteOwnAppointment,
	adminDeleteAppointment,
	updateOwnAppointment,
	adminUpdateAppointment,
} from '../controllers/appointmentController';
import { protect, isAdmin } from '../middleware/authMiddleware';

const router = Router();

// Ruta protegida para ver todas las citas de un usuario
router.get('/appointments', protect, getUserAppointments);

// Ruta protegida para agregar una nueva cita
router.post('/appointments', protect, createAppointment);
router.put('/my/:id', protect, updateOwnAppointment);

router.delete('/my/:id', protect, deleteOwnAppointment); // El usuario elimina la suya

// Ruta protegida para ver todas las citas de todos los usuarios (solo admin)
router.get('/appointments/all', protect, isAdmin, getAllAppointments);
// Admin actualiza cualquier cita
router.put('/:id', protect, isAdmin, adminUpdateAppointment);
router.delete('/:id', protect, isAdmin, adminDeleteAppointment); // Admin elimina cualquiera

export default router;
