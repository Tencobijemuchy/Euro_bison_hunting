import { Notify } from 'quasar'
import { useChannelsStore } from 'src/stores/channels'
import { useUserStore } from 'src/stores/user'

export function useCommands(context: { channelName: string }) {
  const channels = useChannelsStore()
  const user = useUserStore()

  function run(raw: string) {
    const meMaybe = user.me?.nickname
    if (!meMaybe) {
      Notify.create({ type: 'warning', message: 'Please login first.' })
      return false
    }
    const me = meMaybe

    const txt = raw.trim()
    if (!txt.startsWith('/')) return false

    const [cmd, ...args] = txt.split(/\s+/)
    const ch = channels.byName(context.channelName)
    if (!ch) {
      Notify.create({ type: 'negative', message: 'Channel not found.' })
      return true
    }

    try {
      switch (cmd) {
        case '/invite': {
          const target = (args[0] ?? '')
          if (!target) throw new Error('Usage: /invite nickName')
          channels.invite(me, ch.name, target)
          Notify.create({ type: 'positive', message: `Invited ${target}` })
          break
        }
        case '/revoke': {
          const target = (args[0] ?? '')
          if (!target) throw new Error('Usage: /revoke nickName')
          channels.revoke(me, ch.name, target)
          Notify.create({ type: 'warning', message: `Revoked ${target}` })
          break
        }
        case '/kick': {
          const target = (args[0] ?? '')
          if (!target) throw new Error('Usage: /kick nickName')
          const res = channels.kick(me, ch.name, target)
          if (res.banned) {
            Notify.create({ type: 'negative', message: `${target} was banned.` })
          } else {
            Notify.create({ type: 'info', message: `Kick vote for ${target}: ${res.votes}/3` })
          }
          break
        }
        case '/quit': {
          channels.quitChannel(me, ch.name)
          Notify.create({ type: 'warning', message: `Channel ${ch.name} deleted.` })
          break
        }
        case '/cancel': {
          channels.cancelMembership(me, ch.name)
          Notify.create({ type: 'info', message: `You left ${ch.name}.` })
          break
        }
        case '/list': {
          Notify.create({ type: 'info', message: `Members: ${ch.members.join(', ')}` })
          break
        }
        default:
          Notify.create({ type: 'warning', message: `Unknown command: ${cmd}` })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Command failed.'
      Notify.create({ type: 'negative', message: msg })
    }

    channels.cleanupStaleChannels()
    return true
  }

  return { run }
}
