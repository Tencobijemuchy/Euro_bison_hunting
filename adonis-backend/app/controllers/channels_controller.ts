import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class ChannelsController {

   //GET /api/channels

  async index({ response }: HttpContext) {
    const channels = await Channel.query()
      .preload('owner')
      .preload('members')
      .orderBy('created_at', 'desc')

    // Format pre frontend
    const formatted = channels.map((ch) => ({
      id: ch.id,
      channelName: ch.channelName,
      isPrivate: ch.isPrivate,
      ownerNickname: ch.owner.nickName,
      ownerId: ch.ownerId,
      status: ch.status,
      lastActivityAt: ch.lastActivityAt?.toISO(),
      createdAt: ch.createdAt.toISO(),
      updatedAt: ch.updatedAt.toISO(),
      members: ch.members.map((m) => m.nickName),
      banned: ch.members.filter((m) => m.$extras.pivot_is_banned).map((m) => m.nickName),
      kickVotes: {},
      topInvitedFor: {},
    }))

    return response.json(formatted)
  }


   //GET /api/channels/:name

  async show({ params, response }: HttpContext) {
    const channel = await Channel.query()
      .whereRaw('LOWER(channel_name) = LOWER(?)', [params.name])
      .preload('owner')
      .preload('members')
      .first()

    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    return response.json({
      id: channel.id,
      channelName: channel.channelName,
      isPrivate: channel.isPrivate,
      ownerNickname: channel.owner.nickName,
      ownerId: channel.ownerId,
      status: channel.status,
      lastActivityAt: channel.lastActivityAt?.toISO(),
      createdAt: channel.createdAt.toISO(),
      updatedAt: channel.updatedAt.toISO(),
      members: channel.members.map((m) => m.nickName),
      banned: channel.members.filter((m) => m.$extras.pivot_is_banned).map((m) => m.nickName),
      kickVotes: {},
      topInvitedFor: {},
    })
  }


   //POST /api/channels/join

  async join({ request, response }: HttpContext) {
    const { nickname, channelName, isPrivate } = request.only([
      'nickname',
      'channelName',
      'isPrivate',
    ])

    if (!nickname || !channelName) {
      return response.badRequest({ message: 'Nickname and channelName required' })
    }

    // Najdi usera
    const user = await User.findBy('nickName', nickname)
    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    // Najdi kanal (case-insensitive)
    let channel = await Channel.query()
      .whereRaw('LOWER(channel_name) = LOWER(?)', [channelName])
      .preload('owner')
      .preload('members')
      .first()

    if (channel) {
      // Kanal existuje - pridaj clena
      const isMember = channel.members.some((m) => m.id === user.id)

      if (!isMember) {
        await channel.related('members').attach([user.id])
        await channel.load('members')
      }

      return response.json({
        created: false,
        channel: {
          id: channel.id,
          channelName: channel.channelName,
          isPrivate: channel.isPrivate,
          ownerNickname: channel.owner.nickName,
          ownerId: channel.ownerId,
          status: channel.status,
          lastActivityAt: channel.lastActivityAt?.toISO(),
          createdAt: channel.createdAt.toISO(),
          updatedAt: channel.updatedAt.toISO(),
          members: channel.members.map((m) => m.nickName),
          banned: [],
          kickVotes: {},
          topInvitedFor: {},
        },
      })
    }

    // Vytvor novy kanal
    channel = await Channel.create({
      channelName,
      isPrivate: isPrivate || false,
      ownerId: user.id,
      status: 'active',
      lastActivityAt: DateTime.now(),
    })

    // Pridaj vlastnika ako clena
    await channel.related('members').attach([user.id])


    await channel.load('owner')
    await channel.load('members')

    return response.json({
      created: true,
      channel: {
        id: channel.id,
        channelName: channel.channelName,
        isPrivate: channel.isPrivate,
        ownerNickname: channel.owner.nickName, // <- Toto crashovalo!
        ownerId: channel.ownerId,
        status: channel.status,
        lastActivityAt: channel.lastActivityAt?.toISO(),
        createdAt: channel.createdAt.toISO(),
        updatedAt: channel.updatedAt.toISO(),
        members: channel.members.map((m) => m.nickName),
        banned: [],
        kickVotes: {},
        topInvitedFor: {},
      },
    })
  }
}
