import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import User from '#models/user'
import Invitation from '#models/invitation'
import { DateTime } from 'luxon'
import Database from '@adonisjs/lucid/services/db'
import { io } from '#start/socket'

export default class ChannelsController {
  //GET /api/channels

  async index({ response }: HttpContext) {
    const channels = await Channel.query()
      .preload('owner')
      .preload('members')
      .orderBy('created_at', 'desc')

    // Načítaj všetky pending invitations
    const invitations = await Invitation.query().where('status', 'pending').preload('invitee')

    // Format pre frontend
    const formatted = channels.map((ch) => {
      const topInvitedFor: Record<string, string> = {}

      invitations
        .filter((inv) => inv.channelId === ch.id)
        .forEach((inv) => {
          if (inv.invitee?.nickName) {
            topInvitedFor[inv.invitee.nickName] = inv.createdAt.toISO() ?? ''
          }
        })

      return {
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
        topInvitedFor,
      }
    })

    return response.json(formatted)
  }

  //GET /api/channels/:name

  async show({ params, request, response }: HttpContext) {
    const channel = await Channel.query()
      .whereRaw('LOWER(channel_name) = LOWER(?)', [params.name])
      .preload('owner')
      .preload('members')
      .first()

    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    //BAN CHECK: bannnutý user nesmie dostať members (/list)
    const userIdHeader = request.header('X-User-Id')
    if (!userIdHeader) {
      return response.unauthorized({ message: 'Missing X-User-Id header' })
    }

    const requesterId = Number(userIdHeader)

    const requesterPivot = await Database.from('channel_user')
      .where({ channel_id: channel.id, user_id: requesterId })
      .first()

    if (!requesterPivot) {
      return response.forbidden({ message: 'Not a channel member' })
    }

    if (requesterPivot.is_banned) {
      return response.forbidden({ message: 'You are banned from this channel' })
    }

    // nacita pending ivnv pre tento kanal
    const invitations = await Invitation.query()
      .where('channel_id', channel.id)
      .where('status', 'pending')
      .preload('invitee')

    const topInvitedFor: Record<string, string> = {}
    invitations.forEach((inv) => {
      if (inv.invitee?.nickName) {
        topInvitedFor[inv.invitee.nickName] = inv.createdAt.toISO() ?? ''
      }
    })

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
      topInvitedFor,
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
      // ak je user v pivote a je banned, nemoze join
      const pivot = await Database.from('channel_user')
        .where({ channel_id: channel.id, user_id: user.id })
        .first()

      if (pivot?.is_banned) {
        return response.forbidden({ message: 'You are banned from this channel' })
      }

      const isMember = channel.members.some((m) => m.id === user.id)

      if (!isMember) {
        await channel.related('members').attach([user.id])
        await channel.load('members')

        // Ak existuje pending invitation oznaci ju na accpeted
        await Invitation.query()
          .where('channel_id', channel.id)
          .where('invitee_id', user.id)
          .where('status', 'pending')
          .update({ status: 'accepted' })
      }

      // load invitations
      const invitations = await Invitation.query()
        .where('channel_id', channel.id)
        .where('status', 'pending')
        .preload('invitee')

      const topInvitedFor: Record<string, string> = {}
      invitations.forEach((inv) => {
        if (inv.invitee?.nickName) {
          topInvitedFor[inv.invitee.nickName] = inv.createdAt.toISO() ?? ''
        }
      })

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
          topInvitedFor,
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

    const payload = {
      id: channel.id,
      channelName: channel.channelName,
      isPrivate: channel.isPrivate,
      ownerNickname: channel.owner.nickName,
      ownerId: channel.ownerId,
      status: channel.status,
      lastActivityAt: channel.lastActivityAt?.toISO() ?? null,
      createdAt: channel.createdAt.toISO() ?? '',
      members: channel.members.map((m) => m.nickName),
      banned: [],
      kickVotes: {},
      topInvitedFor: {},
    }

    io.emit('channels:created', payload)

    return response.json({
      created: true,
      channel: payload,
    })

  }

  // POST /api/channels/:channelName/invite - inv usera
  async invite({ params, request, response }: HttpContext) {
    const { channelName } = params
    const { inviterNickname, inviteeNickname } = request.only([
      'inviterNickname',
      'inviteeNickname',
    ])

    if (!inviterNickname || !inviteeNickname) {
      return response.badRequest({ message: 'Both inviter and invitee nicknames required' })
    }

    // find channekl
    const channel = await Channel.query()
      .whereRaw('LOWER(channel_name) = LOWER(?)', [channelName])
      .preload('owner')
      .preload('members')
      .first()

    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    // find invitera a invitee
    const inviter = await User.findBy('nickName', inviterNickname)
    const invitee = await User.findBy('nickName', inviteeNickname)

    if (!inviter || !invitee) {
      return response.notFound({ message: 'User not found' })
    }

    const isInviterMember = channel.members.some((m) => m.id === inviter.id)
    const isInviterOwner = channel.ownerId === inviter.id

    if (channel.isPrivate) {
      if (!isInviterOwner) {
        return response.forbidden({ message: 'Only channel owner can invite to private channel' })
      }
    } else {
      if (!isInviterMember) {
        return response.forbidden({ message: 'Only channel members can invite to public channel' })
      }
    }

    // ak je invitee banned, owner ho vie unban cez /invite
    const bannedPivot = await Database.from('channel_user')
      .where({ channel_id: channel.id, user_id: invitee.id })
      .first()

    if (bannedPivot?.is_banned) {
      if (!isInviterOwner) {
        return response.forbidden({ message: 'Only owner can unban a user' })
      }

      await Database.from('channel_user')
        .where({ channel_id: channel.id, user_id: invitee.id })
        .update({
          is_banned: false,
          kick_count: 0,
          updated_at: DateTime.utc().toFormat('yyyy-LL-dd HH:mm:ss'),
        })

      await Database.from('kick_votes')
        .where({ channel_id: channel.id, target_user_id: invitee.id })
        .delete()

      return response.ok({
        message: `${inviteeNickname} unbanned and re-invited to ${channelName}`,
        channelName: channel.channelName,
        invitee: inviteeNickname,
        unbanned: true,
      })
    }

    const isInviteeAlreadyMember = channel.members.some((m) => m.id === invitee.id)
    if (isInviteeAlreadyMember) {
      return response.badRequest({ message: `${inviteeNickname} is already a member` })
    }

    const existingInvitation = await Invitation.query()
      .where('channel_id', channel.id)
      .where('invitee_id', invitee.id)
      .where('status', 'pending')
      .first()

    if (existingInvitation) {
      return response.badRequest({ message: `${inviteeNickname} is already invited` })
    }

    // Vytvor invitation
    await Invitation.create({
      channelId: channel.id,
      inviterId: inviter.id,
      inviteeId: invitee.id,
      status: 'pending',
    })

    // realtime pozvánka len pre invitee
    io.to(`user:${invitee.id}`).emit('channels:invited', {
      channelName: channel.channelName,
      invitee: invitee.nickName,
      createdAt: DateTime.utc().toISO(),
    })


    return response.ok({
      message: `${inviteeNickname} invited to ${channelName}`,
      channelName: channel.channelName,
      invitee: inviteeNickname,
    })
  }

  // DELETE /api/channels/:channelName/revoke - odoberie člena alebo zruší invitation
  async revoke({ params, request, response }: HttpContext) {
    const { channelName } = params
    const { revokerNickname, targetNickname } = request.only(['revokerNickname', 'targetNickname'])

    if (!revokerNickname || !targetNickname) {
      return response.badRequest({ message: 'Both revoker and target nicknames required' })
    }

    const channel = await Channel.query()
      .whereRaw('LOWER(channel_name) = LOWER(?)', [channelName])
      .preload('owner')
      .preload('members')
      .first()

    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    // Nájdi revokera a target usera
    const revoker = await User.findBy('nickName', revokerNickname)
    const target = await User.findBy('nickName', targetNickname)

    if (!revoker || !target) {
      return response.notFound({ message: 'User not found' })
    }

    const isRevokerOwner = channel.ownerId === revoker.id
    const isSelfRevoke = revoker.id === target.id // Odchádza sám

    if (channel.isPrivate) {
      if (!isRevokerOwner && !isSelfRevoke) {
        return response.forbidden({
          message: 'Only channel owner can revoke others in private channel',
        })
      }
    } else {
      const isRevokerMember = channel.members.some((m) => m.id === revoker.id)
      if (!isRevokerOwner && !isRevokerMember && !isSelfRevoke) {
        return response.forbidden({ message: 'Only channel owner or members can revoke' })
      }
    }

    let removed = false
    let invitationCancelled = false

    const invitation = await Invitation.query()
      .where('channel_id', channel.id)
      .where('invitee_id', target.id)
      .where('status', 'pending')
      .first()

    if (invitation) {
      await invitation.delete()
      invitationCancelled = true
    }

    const isMember = channel.members.some((m) => m.id === target.id)

    if (isMember) {
      await channel.related('members').detach([target.id])
      removed = true
    }

    if (!removed && !invitationCancelled) {
      return response.notFound({
        message: `${targetNickname} is not a member and has no pending invitation`,
      })
    }

    const actions = []
    if (removed) actions.push('removed from channel')
    if (invitationCancelled) actions.push('invitation cancelled')

    return response.ok({
      message: `${targetNickname} ${actions.join(' and ')} in ${channelName}`,
      channelName: channel.channelName,
      target: targetNickname,
      removed,
      invitationCancelled,
    })
  }

  // POST /api/channels/:channelName/kick
  async kick({ params, request, response }: HttpContext) {
    const { channelName } = params
    const { kickerNickname, targetNickname } = request.only(['kickerNickname', 'targetNickname'])

    if (!kickerNickname || !targetNickname) {
      return response.badRequest({ message: 'Both kicker and target nicknames required' })
    }

    const channel = await Channel.query()
      .whereRaw('LOWER(channel_name) = LOWER(?)', [channelName])
      .preload('owner')
      .preload('members')
      .first()

    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    const kicker = await User.findBy('nickName', kickerNickname)
    const target = await User.findBy('nickName', targetNickname)

    if (!kicker || !target) {
      return response.notFound({ message: 'User not found' })
    }

    const isKickerOwner = channel.ownerId === kicker.id
    const isKickerMember = channel.members.some((m) => m.id === kicker.id)
    const isTargetMember = channel.members.some((m) => m.id === target.id)

    if (!isKickerOwner && !isKickerMember) {
      return response.forbidden({ message: 'You are not a member of this channel' })
    }
    if (!isTargetMember) {
      return response.badRequest({ message: `${targetNickname} is not a member of this channel` })
    }
    if (target.id === channel.ownerId) {
      return response.forbidden({ message: 'Owner cannot be kicked' })
    }

    const pivot = await Database.from('channel_user')
      .where({ channel_id: channel.id, user_id: target.id })
      .first()

    if (pivot?.is_banned) {
      return response.badRequest({ message: `${targetNickname} is already banned` })
    }

    // helper na realtime notify pre targeta
    const notifyKick = (permanent = true) => {
      io.to(`user:${target.id}`).emit('channels:kicked', {
        channelId: channel.id,
        channelName: channel.channelName,
        message: `Bol si kicknutý z #${channel.channelName}`,
        permanent,
      })
    }


    // PRIVATE: len owner a hned permanent ban
    if (channel.isPrivate) {
      if (!isKickerOwner) {
        return response.forbidden({ message: 'Only owner can kick in private channel' })
      }

      await Database.from('channel_user')
        .where({ channel_id: channel.id, user_id: target.id })
        .update({
          is_banned: true,
          kick_count: 3,
          updated_at: DateTime.utc().toFormat('yyyy-LL-dd HH:mm:ss'),
        })

      notifyKick(true)

      return response.ok({
        message: `${targetNickname} permanently banned from ${channel.channelName}`,
        permanent: true,
        kickCount: 3,
      })
    }

    // PUBLIC: owner = instant permaban
    if (isKickerOwner) {
      await Database.from('channel_user')
        .where({ channel_id: channel.id, user_id: target.id })
        .update({
          is_banned: true,
          kick_count: 3,
          updated_at: DateTime.utc().toFormat('yyyy-LL-dd HH:mm:ss'),
        })

      notifyKick(true)

      return response.ok({
        message: `${targetNickname} permanently banned by owner`,
        permanent: true,
        kickCount: 3,
      })
    }

    // PUBLIC: normal member vote (musí byť unikátne)
    const existingVote = await Database.from('kick_votes')
      .where({
        channel_id: channel.id,
        target_user_id: target.id,
        voter_user_id: kicker.id,
      })
      .first()

    if (existingVote) {
      return response.badRequest({ message: 'You already voted to kick this user' })
    }

    await Database.table('kick_votes').insert({
      channel_id: channel.id,
      target_user_id: target.id,
      voter_user_id: kicker.id,
      created_at: DateTime.utc().toFormat('yyyy-LL-dd HH:mm:ss'),
      updated_at: DateTime.utc().toFormat('yyyy-LL-dd HH:mm:ss'),
    })

    const [{ total }] = await Database.from('kick_votes')
      .where({ channel_id: channel.id, target_user_id: target.id })
      .count('* as total')

    const kickCount = Number(total)

    await Database.from('channel_user')
      .where({ channel_id: channel.id, user_id: target.id })
      .update({ kick_count: kickCount, updated_at: DateTime.utc().toFormat('yyyy-LL-dd HH:mm:ss'),
      })

    if (kickCount >= 3) {
      await Database.from('channel_user')
        .where({ channel_id: channel.id, user_id: target.id })
        .update({ is_banned: true, updated_at: DateTime.utc().toFormat('yyyy-LL-dd HH:mm:ss'),
        })

      notifyKick(true)

      return response.ok({
        message: `${targetNickname} permanently banned (3 kicks reached)`,
        permanent: true,
        kickCount,
      })
    }

    return response.ok({
      message: `Kick vote recorded on ${targetNickname} (${kickCount}/3)`,
      permanent: false,
      kickCount,
      remaining: 3 - kickCount,
    })
  }

  // DELETE /api/channels/:id/quit - zmazanie kanála (len owner)
  async quit({ params, request, response }: HttpContext) {
    try {
      const { id } = params
      const userId = request.header('X-User-Id')

      if (!userId) {
        return response.unauthorized({ message: 'Not authenticated' })
      }

      const channel = await Channel.find(id)

      if (!channel) {
        return response.notFound({ message: 'Channel not found' })
      }

      // Skontroluj ci je user owner
      if (channel.ownerId !== Number(userId)) {
        return response.forbidden({ message: 'Only channel owner can delete the channel' })
      }

      await Database.from('channel_user').where('channel_id', id).delete()

      await Database.from('messages').where('channel_id', id).delete()

      await Database.from('invitations').where('channel_id', id).delete()

      await Database.from('typing_indicators').where('channel_id', id).delete()

      await channel.delete()

      return response.ok({
        message: 'Channel deleted successfully',
        channelName: channel.channelName,
      })
    } catch (error) {
      console.error('Quit channel error:', error)
      return response.internalServerError({ message: 'Failed to delete channel' })
    }
  }
}
