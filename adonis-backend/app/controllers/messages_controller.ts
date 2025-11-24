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

    const messageData = {
      id: message.id,
      channelId: message.channelId,
      authorId: message.authorId,
      authorNickname: message.author.nickName,
      body: message.body,
      mentionedUserId: message.mentionedUserId,
      createdAt: message.createdAt.toISO(),
    }

    // ✅ Emit do channel roomky
    io.to(`channel:${channelId}`).emit('message:new', messageData)

    // ✅ Poslať notifikácie používateľom ktorí majú správne nastavenia
    await this.sendNotifications(channel, message, user)

    return { success: true, message: messageData }
  }

  // ✅ Helper: Odoslanie notifikácií na základe DB nastavení
  private async sendNotifications(channel: Channel, message: Message, author: User) {
    try {
      // Načítaj všetkých členov kanála (okrem autora správy)
      await channel.load('members')
      const members = channel.members.filter((m) => m.id !== author.id)

      console.log(`Sending notifications for channel ${channel.id}, members:`, members.length)

      for (const member of members) {
        // Skontroluj notifikačné nastavenia z DB
        const notificationMode = (member.notifications || 'all').toLowerCase() // ✅ toLowerCase()

        console.log(`User ${member.id} notification mode: ${member.notifications} -> ${notificationMode}`)

        let shouldNotify = false

        switch (notificationMode) {
          case 'all':
            shouldNotify = true
            break

          case 'mentions':
          case 'mentions only': // ✅ Pridaná podpora pre 'Mentions only'
            shouldNotify = message.mentionedUserId === member.id
            break

          case 'off':
            shouldNotify = false
            break

          default:
            shouldNotify = false
        }

        console.log(`User ${member.id} shouldNotify: ${shouldNotify}`) // ✅ DEBUG

        if (shouldNotify) {
          console.log(
            `Sending notification to user ${member.id} for message in channel ${channel.channelName}`
          )

          // Pošli notifikáciu do user roomky
          io.to(`user:${member.id}`).emit('notification:new', {
            type: 'message',
            messageId: message.id,
            channelId: channel.id,
            channelName: channel.channelName,
            authorId: author.id,
            authorNickname: author.nickName,
            body: message.body,
            mentionedUserId: message.mentionedUserId,
            timestamp: message.createdAt.toISO(),
          })
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error)
    }
  }
}
