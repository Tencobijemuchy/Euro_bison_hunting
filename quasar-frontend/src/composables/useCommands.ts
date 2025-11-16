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

  //spracovanie vstupneho textu - ZMENA: async
  async function run(raw: string) {
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

      // /join je globalny - ZMENA: await
      if (cmd === '/join') {
        const target = args[0] ?? '';
        if (!target) {
          Notify.create({ type: 'negative', message: 'usage: /join channelName [private]' });
          return true;
        }
        const isPrivate = (args[1]?.toLowerCase() ?? '') === 'private';
        try {
          // ZMENA: await na async operaciu
          const res = await channels.joinChannel(me, target, isPrivate);
          Notify.create({
            type: 'positive',
            message: res.created ? `channel ${target} created.` : `joined ${target}.`,
          });
          context.onJoinSuccess?.(target, !!res.created);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'join failed.';
          Notify.create({ type: 'negative', message: msg });
        }
        //channels.cleanupStaleChannels();
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
        const [cmd] = txt.split(/\s+/)
        switch (cmd) {
          //--------------------------------------------------------------------------------------------------INV

          case '/invite': {
            Notify.create({ type: 'positive', message: `invite` })
            break
          }
          //--------------------------------------------------------------------------------------------------REVOKE
          case '/revoke': {
            Notify.create({ type: 'warning', message: `revoke` })
            break
          }
          //--------------------------------------------------------------------------------------------------KICK

          case '/kick': {
            Notify.create({ type: 'warning', message: `kick` })
            break
          }
          //--------------------------------------------------------------------------------------------------QUIT
          case '/quit': {
            Notify.create({ type: 'warning', message: `quit` })
            break
          }
          //--------------------------------------------------------------------------------------------------CANCEL
          case '/cancel': {
            Notify.create({ type: 'info', message: `cancel` })
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


    if (!channels.isMember(ch.channelName, me)) {
      // ZMENA: await pre join ak user nie je clenom
      await channels.joinChannel(me, ch.channelName)
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
