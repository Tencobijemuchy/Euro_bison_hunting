import { Server } from 'socket.io'

export let io: Server

export function initSocket(httpServer: any) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  })

  io.on('connection', (socket) => {
    // klient po connecte pošle userId -> dáme ho do roomky user:{id}
    socket.on('auth', (payload) => {
      const userId = Number(payload?.userId)
      if (userId) socket.join(`user:${userId}`)
    })

    // voliteľné: roomky pre kanály (ak chceš realtime members)
    socket.on('join:channel', ({ channelId }) => {
      if (channelId) socket.join(`channel:${channelId}`)
    })

    socket.on('leave:channel', ({ channelId }) => {
      if (channelId) socket.leave(`channel:${channelId}`)
    })
  })

  return io
}
