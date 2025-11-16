
import { Notify } from 'quasar'
import { useChannelsStore } from 'src/stores/channels'
import { useUserStore } from 'src/stores/user'
import type { Router } from 'vue-router'

// typ callbacku pre pridanie spravy do ui
type PushMsg = (msg: { author: string; text: string; ts?: number }) => void

// kontext od volajuceho (channel page alebo channels page)
type Ctx = {
  channelName?: string                     // aktualny kanal
  pushMessage?: PushMsg                    // pridanie beznej spravy
  onAfterNormalMessage?: () => void        // napr. scroll na spodok
  onJoinSuccess?: (chName: string, created: boolean) => void // callback po uspesnom commande
  router?: Router
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
          //--------------------------------------------------------------------------------------------------INVITE
          case '/invite': {
            const targetNick = args[0]?.trim()

            if (!targetNick) {
              Notify.create({
                type: 'negative',
                message: 'usage: /invite nickname'
              })
              break
            }

            // Kontrola oprávnení
            if (ch.isPrivate) {
              // Súkromný kanál - len owner môže invitovať
              if (ch.ownerNickname !== me) {
                Notify.create({
                  type: 'negative',
                  message: 'Only channel owner can invite to private channel'
                })
                break
              }
            } else {
              // Verejný kanál - len členovia môžu invitovať
              if (!channels.isMember(ch.channelName, me)) {
                Notify.create({
                  type: 'negative',
                  message: 'Only channel members can invite'
                })
                break
              }
            }

            try {
              await channels.inviteUser(ch.channelName, me, targetNick)
              Notify.create({
                type: 'positive',
                message: `${targetNick} invited to ${ch.channelName}`
              })
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'invite failed'
              Notify.create({ type: 'negative', message: msg })
            }
            break
          }
          //--------------------------------------------------------------------------------------------------REVOKE
          case '/revoke': {
            const targetNick = args[0]?.trim()

            if (!targetNick) {
              Notify.create({
                type: 'negative',
                message: 'usage: /revoke nickname'
              })
              break
            }

            // Kontrola oprávnení
            if (ch.isPrivate) {
              // Súkromný kanál - len owner môže revokovať
              if (ch.ownerNickname !== me) {
                Notify.create({
                  type: 'negative',
                  message: 'Only channel owner can revoke in private channel'
                })
                break
              }
            } else {
              // Verejný kanál - owner alebo členovia môžu revokovať
              const isOwner = ch.ownerNickname === me
              const isMember = channels.isMember(ch.channelName, me)

              if (!isOwner && !isMember) {
                Notify.create({
                  type: 'negative',
                  message: 'Only channel owner or members can revoke'
                })
                break
              }
            }

            try {
              await channels.revokeUser(ch.channelName, me, targetNick)
              Notify.create({
                type: 'positive',
                message: `${targetNick} revoked from ${ch.channelName}`
              })
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'revoke failed'
              Notify.create({ type: 'negative', message: msg })
            }
            break
          }
          //--------------------------------------------------------------------------------------------------KICK

          case '/kick': {
            Notify.create({ type: 'warning', message: `kick - not implemented yet` })
            break
          }
          //--------------------------------------------------------------------------------------------------QUIT
          case '/quit': {
            if (ch.ownerId !== user.me?.id) {
              Notify.create({
                type: 'negative',
                message: 'Only channel owner can delete the channel'
              })
              break
            }

            if (!ch.id) {
              Notify.create({
                type: 'negative',
                message: 'Invalid channel ID'
              })
              break
            }

            try {
              await channels.deleteChannel(ch.id)

              Notify.create({
                type: 'positive',
                message: `Channel ${chName} deleted successfully`
              })

              void context.router?.push('/channels')
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Failed to delete channel'
              Notify.create({ type: 'negative', message: msg })
            }
            break
          }
          //--------------------------------------------------------------------------------------------------CANCEL
          case '/cancel': {
            // Ak som owner, zmaž kanál (ako /quit)
            if (ch.ownerId === user.me?.id) {
              if (!ch.id) {
                Notify.create({
                  type: 'negative',
                  message: 'Invalid channel ID'
                })
                break
              }

              try {
                await channels.deleteChannel(ch.id)
                Notify.create({
                  type: 'positive',
                  message: `Channel ${chName} deleted successfully`
                })
                void context.router?.push('/channels')
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Failed to delete channel'
                Notify.create({ type: 'negative', message: msg })
              }
            } else {
              // Ak nie som owner, opusti kanal (revoke sám na seba)
              if (!channels.isMember(ch.channelName, me)) {
                Notify.create({
                  type: 'negative',
                  message: 'You are not a member of this channel'
                })
                break
              }

              try {
                await channels.revokeUser(ch.channelName, me, me)
                Notify.create({
                  type: 'positive',
                  message: `You left ${ch.channelName}`
                })
                void context.router?.push('/channels')
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Failed to leave channel'
                Notify.create({ type: 'negative', message: msg })
              }
            }
            break
          }
          //--------------------------------------------------------------------------------------------------LIST
          case '/list': {
            Notify.create({ type: 'info', message: `members: ${ch.members.join(', ')}` })
            break
          }
          default:
            Notify.create({ type: 'negative', message: 'unknown command' })
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'command failed.'
        Notify.create({ type: 'negative', message: msg })
      }
      return true
    }


    if (!channels.isMember(ch.channelName, me)) {
      await channels.joinChannel(me, ch.channelName)
    }


    push({ author: me, text: txt, ts: Date.now() })
    context.onAfterNormalMessage?.()
    return true
  }

  // export verejne dostupnych funkcii
  return { run }
}
