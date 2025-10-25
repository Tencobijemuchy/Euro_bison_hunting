
import { Notify } from 'quasar'
import { useChannelsStore } from 'src/stores/channels'
import { useUserStore } from 'src/stores/user'

// typ callbacku pre pridanie spravy do ui
type PushMsg = (msg: { author: string; text: string; ts?: number }) => void

// kontext od volajuceho (channel page alebo channels page)
type Ctx = {
  channelName?: string                     // aktualny kanal
  pushMessage?: PushMsg                    // pridanie beznej spravy
  onAfterNormalMessage?: () => void        // napr. scroll na spodok
  onJoinSuccess?: (chName: string, created: boolean) => void // callback po uspesnom commande
}


/* hlavny blok na spracovanie prikazov a beznych sprav */
export function useCommands(context: Ctx) {
  const channels = useChannelsStore()
  const user = useUserStore()

  // fallback pre pushMessage ak nepride z kontextu
  const push = context.pushMessage ?? (() => {})

  //spracovanie vstupneho textu
  function run(raw: string) {
    //osekanie vstupu
    const txt = (raw ?? '').trim()
    if (!txt) return false

    // kontrola prihlasenia
    const me = user.me?.nickname
    if (!me) {
      Notify.create({ type: 'warning', message: 'please login first.' })
      return true
    }

    if (txt.startsWith('/')) {
      const [cmd, ...args] = txt.split(/\s+/);

      // /join je globalny
      if (cmd === '/join') {
        const target = args[0] ?? '';
        if (!target) {
          Notify.create({ type: 'negative', message: 'usage: /join channelName [private]' });
          return true;
        }
        const isPrivate = (args[1]?.toLowerCase() ?? '') === 'private';
        try {
          const res = channels.joinChannel(me, target, isPrivate);
          Notify.create({
            type: 'positive',
            message: res.created ? `channel ${target} created.` : `joined ${target}.`,
          });
          context.onJoinSuccess?.(target, !!res.created);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'join failed.';
          Notify.create({ type: 'negative', message: msg });
        }
        channels.cleanupStaleChannels();
        return true;
      }

    }
    const chName = context.channelName ?? ''
    const ch = channels.byName(chName)
    if (!ch) {
      Notify.create({ type: 'negative', message: 'unknown command' })
      return true
    }

    if (txt.startsWith('/')) {
      try {
        const [cmd, ...args] = txt.split(/\s+/)
        switch (cmd) {
          //--------------------------------------------------------------------------------------------------INV

          case '/invite': {
            const target = args[0] ?? ''
            if (!target) throw new Error('usage: /invite nickname')
            channels.invite(me, ch.name, target)
            Notify.create({ type: 'positive', message: `invited ${target}` })
            break
          }
          //--------------------------------------------------------------------------------------------------REVOKE
          case '/revoke': {
            const target = args[0] ?? ''
            if (!target) throw new Error('usage: /revoke nickname')
            channels.revoke(me, ch.name, target)
            Notify.create({ type: 'warning', message: `revoked ${target}` })
            break
          }
          //--------------------------------------------------------------------------------------------------KICK
          case '/kick': {
            const target = args[0] ?? ''
            if (!target) throw new Error('usage: /kick nickname')
            const res = channels.kick(me, ch.name, target)
            if (res.banned) {
              Notify.create({ type: 'negative', message: `${target} was banned.` })
            } else {
              Notify.create({ type: 'info', message: `kick vote for ${target}: ${res.votes}/3` })
            }
            break
          }
          //--------------------------------------------------------------------------------------------------QUIT
          case '/quit': {
            channels.quitChannel(me, ch.name)
            Notify.create({ type: 'warning', message: `channel ${ch.name} deleted.` })
            break
          }
          //--------------------------------------------------------------------------------------------------CANCEL
          case '/cancel': {
            channels.cancelMembership(me, ch.name)
            Notify.create({ type: 'info', message: `you left ${ch.name}.` })
            break
          }
          //--------------------------------------------------------------------------------------------------LIST

          case '/list': {
            Notify.create({ type: 'info', message: `members: ${ch.members.join(', ')}` })
            break
          }
          default:

        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'command failed.'
        Notify.create({ type: 'negative', message: msg })
      }
      //channels.cleanupStaleChannels()
      return true
    }


    if (!channels.isMember(ch.name, me)) {
      channels.joinChannel(me, ch.name)
    }


    push({ author: me, text: txt, ts: Date.now() })
    //channels.noteMessage(ch.name)
    //channels.clearOwnDraft(ch.name, me)
    //channels.cleanupStaleChannels()
    context.onAfterNormalMessage?.()
    return true
  }

  // export verejne dostupnych funkcii
  return { run }
}
