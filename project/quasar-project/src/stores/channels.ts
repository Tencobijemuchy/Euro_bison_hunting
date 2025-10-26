import { defineStore } from 'pinia'

//typ jedneho kanala v aplikacii
export type Channel = {
  name: string
  isPrivate: boolean
  ownerNickname: string
  members: string[]
  banned: string[]
  kickVotes: Record<string, string[]>
  createdAt: string
  lastMessageAt: string | null
  topInvitedFor: Record<string, string>
}
// mapa draftov: channel -> nick -> text draftu
type DraftMap = Record<string, Record<string, string>>

//mapa typing stavov: channel -> nick -> timestamp posledneho pisania
type TypingMap = Record<string, Record<string, number>>

//kluc v localstorage pre trvale ulozenie kanalov
const STORAGE_KEY = 'channels_v2'

//vrati aktualny cas v iso formate
function nowISO() {
  return new Date().toISOString()
}

//vrati datum v iso pred x dnami (na cistenie starych kanalov)
function daysAgoISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

//nacita kanaly z localstorage a doplni pripadne chybajuce polia
function load(): Channel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as Channel[]
    return arr.map(c => ({
      ...c,
      banned: c.banned ?? [],
      kickVotes: c.kickVotes ?? {},
      createdAt: c.createdAt ?? nowISO(),
      lastMessageAt: c.lastMessageAt ?? null,
      topInvitedFor: c.topInvitedFor ?? {}
    }))
  } catch {
    return []
  }
}

//ulozi aktualny zoznam kanalov do localstorage v JSON tvare
function save(channels: Channel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
}

//pinia store pre spravu kanalov, draftov a typing stavov
export const useChannelsStore = defineStore('channels', {
  state: () => ({
    channels: load(),
    drafts: {} as DraftMap,
    typing: {} as TypingMap,
  }),
  getters: {
    byName: (s) => (name: string) => s.channels.find(c => c.name.toLowerCase() === name.toLowerCase()) || null,
    sortedForUser: (s) => (nickname: string) => {
      const hasInvite = (c: Channel) => Boolean(c.topInvitedFor?.[nickname])
      const byInvite = [...s.channels].sort((a, b) => {
        const ai = hasInvite(a), bi = hasInvite(b)
        if (ai && !bi) return -1
        if (!ai && bi) return 1
        const la = a.lastMessageAt || a.createdAt
        const lb = b.lastMessageAt || b.createdAt
        return (lb || '').localeCompare(la || '')
      })
      return byInvite
    },

    //overi, ci je pouzivatel vlastnik daneho kanala
    isOwner: (s) => (channelName: string, nickname: string) => {
      const c = s.channels.find(c => c.name === channelName)
      return c ? c.ownerNickname === nickname : false
    },

    //overi clenstvo pouzivatela v kanali
    isMember: (s) => (channelName: string, nickname: string) => {
      const c = s.channels.find(c => c.name === channelName)
      return c ? c.members.includes(nickname) : false
    },

    //overi, ci je pouzivatel zabanovany v kanali
    isBanned: (s) => (channelName: string, nickname: string) => {
      const c = s.channels.find(c => c.name === channelName)
      return c ? c.banned.includes(nickname) : false
    },

    //vrati zoznam momentalne pisucich v kanali (okrem volitela exceptNick), s timeoutom 3s
    typingList: (s) => (channelName: string, exceptNick?: string) => {
      const ch = s.typing[channelName] || {}
      const now = Date.now()
      return Object.entries(ch)
        .filter(([nick, ts]) => (nick !== (exceptNick || '')) && now - ts < 3000)
        .map(([nick]) => nick)
    },

    //vrati draft text pre dany kanal a nick (alebo prazdny string)
    draftOf: (s) => (channelName: string, nickname: string) => {
      return s.drafts?.[channelName]?.[nickname] || ''
    }
  },

  //actions: menia stav, volaju ukladanie, implementuju logiku kanalov
  actions: {
    persist() { save(this.channels as Channel[]) },
    //pripoji pouzivatela do kanala, alebo kanal vytvori ak neexistuje
    joinChannel(
      a: string | { byNick?: string; name: string; isPrivate?: boolean },
      b?: string,
      c?: boolean
    ) {
      let byNick: string | undefined
      let nameRaw: string
      let isPrivateFlag: boolean | undefined

      if (typeof a === 'string') {
        byNick = a
        nameRaw = (b ?? '').trim()
        isPrivateFlag = c
      } else {
        byNick = a.byNick
        nameRaw = (a.name ?? '').trim()
        isPrivateFlag = a.isPrivate
      }

      if (!nameRaw) {
        throw new Error('Channel name required.')
      }
      if (!byNick) {
        throw new Error('User nickname required.')
      }

      const name = nameRaw
      const exists = this.channels.find(cn => cn.name.toLowerCase() === name.toLowerCase())

      if (!exists) {
        const ch: Channel = {
            name,
            isPrivate: !!isPrivateFlag,
            ownerNickname: byNick,
            members: [byNick],
            banned: [],
            kickVotes: {},
            createdAt: new Date().toISOString(),
            lastMessageAt: null,
            topInvitedFor: {}
          }
        ;(this.channels as Channel[]).push(ch)
        this.persist()
        return { created: true, channel: ch }
      }

      if (exists.banned.includes(byNick)) {
        throw new Error('You are banned from this channel.')
      }

      if (exists.isPrivate) {
        if (!exists.members.includes(byNick)) {
          throw new Error('Private channel: ask the owner to /invite you.')
        }
      } else {
        if (!exists.members.includes(byNick)) {
          exists.members.push(byNick)
          this.persist()
        }
      }

      return { created: false, channel: exists }
    },
    //prida pouzivatela do kanala , zrusi ban a nastavi top pozvanku
    invite(ownerNick: string, channelName: string, targetNick: string) {
      const ch = this.byName(channelName)
      if (!ch) throw new Error('Channel not found.')
      if (ch.ownerNickname !== ownerNick) throw new Error('Only the channel owner can invite.')
      if (!ch.members.includes(ownerNick)) throw new Error('Owner must be a member.')

      ch.banned = ch.banned.filter(n => n !== targetNick)
      if (!ch.members.includes(targetNick)) ch.members.push(targetNick)
      ch.topInvitedFor[targetNick] = nowISO()
      this.persist()
    },

    //odoberie pouzivatela z kanala (len vlastnik)
    revoke(ownerNick: string, channelName: string, targetNick: string) {
      const ch = this.byName(channelName)
      if (!ch) throw new Error('Channel not found.')
      if (ch.ownerNickname !== ownerNick) throw new Error('Only the channel owner can revoke.')
      ch.members = ch.members.filter(n => n !== targetNick)
      this.persist()
    },
    //vykopne pouzivatela z kanalA vlastnik banuje okamzite, bezny clen spusta hlasovanie (3 hlasy)
    kick(requester: string, channelName: string, targetNick: string) {
      const ch = this.byName(channelName)
      if (!ch) throw new Error('Channel not found.')
      if (requester === targetNick) throw new Error('You cannot kick yourself.')
      if (!ch.members.includes(requester)) throw new Error('Only members can kick.')
      if (ch.ownerNickname === requester) {
        ch.banned = Array.from(new Set([...ch.banned, targetNick]))
        ch.members = ch.members.filter(n => n !== targetNick)
        delete ch.kickVotes[targetNick]
        this.persist()
        return { banned: true, votes: 0 }
      }
      if (!ch.kickVotes[targetNick]) ch.kickVotes[targetNick] = []
      const voters = new Set(ch.kickVotes[targetNick])
      voters.add(requester)
      ch.kickVotes[targetNick] = Array.from(voters)
      if (ch.kickVotes[targetNick].length >= 3) {
        ch.banned = Array.from(new Set([...ch.banned, targetNick]))
        ch.members = ch.members.filter(n => n !== targetNick)
        delete ch.kickVotes[targetNick]
        this.persist()
        return { banned: true, votes: 3 }
      }
      this.persist()
      return { banned: false, votes: ch.kickVotes[targetNick].length }
    },

    quitChannel(ownerNick: string, channelName: string) {
      const ch = this.byName(channelName)
      if (!ch) throw new Error('Channel not found.')
      if (ch.ownerNickname !== ownerNick) throw new Error('Only the channel owner can /quit.')
      this.channels = (this.channels as Channel[]).filter(c => c.name !== ch.name)
      this.persist()
    },

    cancelMembership(nickname: string, channelName: string) {
      const ch = this.byName(channelName)
      if (!ch) throw new Error('Channel not found.')
      if (ch.ownerNickname === nickname) {
        this.channels = (this.channels as Channel[]).filter(c => c.name !== ch.name)
      } else {
        ch.members = ch.members.filter(n => n !== nickname)
      }
      this.persist()
    },

    noteMessage(channelName: string) {
      const ch = this.byName(channelName)
      if (!ch) return
      ch.lastMessageAt = nowISO()
      this.persist()
    },

    cleanupStaleChannels() {
      const cutoff = daysAgoISO(30)
      const before = (this.channels as Channel[]).length
      this.channels = (this.channels as Channel[]).filter(c => {
        const last = c.lastMessageAt || c.createdAt
        return last >= cutoff
      })
      if ((this.channels as Channel[]).length !== before) this.persist()
    },

    //nastavi draft text a zaznaci typing pre dany kanal a nick
    setDraft(channelName: string, nickname: string, text: string) {
      if (!this.drafts[channelName]) this.drafts[channelName] = {}
      this.drafts[channelName][nickname] = text
      if (!this.typing[channelName]) this.typing[channelName] = {}
      this.typing[channelName][nickname] = Date.now()
    },

    //simuluje top pozvanku pre pouzivatela (na testovanie zoradenia)
    simulateTopInvite(channelName: string, targetNick: string) {
      const ch = this.byName(channelName)
      if (!ch) throw new Error('Channel not found.')
      ch.topInvitedFor[targetNick] = nowISO()
      this.persist()
    }

  },
})
