import router from '@adonisjs/core/services/router'
import AuthController from '#controllers/auth_controller'
import ChannelsController from '#controllers/channels_controller'

// Health check
router.get('/', async () => {
  return { hello: 'IRC Chat API', status: 'running' }
})

// Auth + Channels routes
router.group(() => {
  router.post('/auth/register', [AuthController, 'register'] as const)
  router.post('/auth/login', [AuthController, 'login'] as const)
  router.post('/auth/logout', [AuthController, 'logout'] as const)
  router.get('/auth/me', [AuthController, 'me'] as const)
  router.patch('/auth/update-settings', [AuthController, 'updateSettings'] as const)

  // Channels
  router.get('/channels', [ChannelsController, 'index'] as const)
  router.get('/channels/:name', [ChannelsController, 'show'] as const)
  router.post('/channels/join', [ChannelsController, 'join'] as const)
  router.delete('/channels/:id/quit', [ChannelsController, 'quit'] as const)

  // Invite & Revoke
  router.post('/channels/:channelName/invite', [ChannelsController, 'invite'] as const)
  router.delete('/channels/:channelName/revoke', [ChannelsController, 'revoke'] as const)

}).prefix('/api')
