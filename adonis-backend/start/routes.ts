import router from '@adonisjs/core/services/router'
import AuthController from '#controllers/auth_controller'

// Health check
router.get('/', async () => {
  return { hello: 'IRC Chat API', status: 'running' }
})

// Auth routes
router.group(() => {
  router.post('/auth/register', [AuthController, 'register'])
  router.post('/auth/login', [AuthController, 'login'])
  router.post('/auth/logout', [AuthController, 'logout'])
  router.get('/auth/me', [AuthController, 'me'])
}).prefix('/api')
