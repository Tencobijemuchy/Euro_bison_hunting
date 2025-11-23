import type { HttpContext } from '@adonisjs/core/http'
import Message from '#models/message'
import Channel from '#models/channel'
import User from '#models/user'
import Database from '@adonisjs/lucid/services/db'
import { io } from '#start/socket'


export default class MessagesController {
  // GET /api/channels/:id/messages?offset=0&limit=30
  public async index({ params, request, response }: HttpContext) {
    const userIdHeader = request.header('X-User-Id')
    if (!userIdHeader) {
      return response.unauthorized({ error: 'Missing X-User-Id header' })
    }

    const userId = Number(userIdHeader)
    const user = await User.find(userId)
    if (!user) {
      return response.unauthorized({ error: 'Invalid user' })
    }

    const channelId = params.id
    const limit = Number(request.input('limit', 30))
    const offset = Number(request.input('offset', 0))

    const channel = await Channel.find(channelId)
    if (!channel) return response.notFound({ error: 'Channel not found' })

    const pivot = await Database.from('channel_user')
      .where({ channel_id: channel.id, user_id: userId })
      .first()

    if (!pivot) {
      return response.forbidden({ error: 'Not a channel member' })
    }

    if (pivot.is_banned) {
      return response.forbidden({ error: 'You are banned from this channel' })
    }


    const messages = await Message.query()
      .where('channel_id', channelId)
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)
      .preload('author')

    return messages
  }

  // POST /api/channels/:id/messages
  public async store({ params, request, response }: HttpContext) {
    const userIdHeader = request.header('X-User-Id')
    if (!userIdHeader) {
      return response.unauthorized({ error: 'Missing X-User-Id header' })
    }

    const userId = Number(userIdHeader)
    const user = await User.find(userId)
    if (!user) {
      return response.unauthorized({ error: 'Invalid user' })
    }

    const channelId = params.id
    const content = request.input('content')

    if (!content || content.trim() === '') {
      return response.badRequest({ error: 'Empty message' })
    }

    const channel = await Channel.find(channelId)
    if (!channel) return response.notFound({ error: 'Channel not found' })

    const pivot = await Database.from('channel_user')
      .where({ channel_id: channel.id, user_id: userId })
      .first()

    if (!pivot) {
      return response.forbidden({ error: 'Not a channel member' })
    }

    if (pivot.is_banned) {
      return response.forbidden({ error: 'You are banned from this channel' })
    }


    // mention detection
    let mentionedUserId: number | undefined = undefined
    const mentionMatch = content.match(/@([A-Za-z0-9_]+)/)
    if (mentionMatch) {
      const nickname = mentionMatch[1]
      const mentionedUser = await User.findBy('nickName', nickname)
      if (mentionedUser) mentionedUserId = mentionedUser.id
    }

    const payload: Partial<Message> = {
      channelId,
      authorId: userId,
      body: content,
    }

    if (mentionedUserId !== undefined) {
      payload.mentionedUserId = mentionedUserId
    }

    const message = await Message.create(payload)
    await message.load('author')

    io.emit('messages:created', message)

    return { success: true, message }

  }
}
