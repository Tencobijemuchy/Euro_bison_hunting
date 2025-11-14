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




//nacita kanaly z localstorage a doplni pripadne chybajuce polia
function load(): Channel[] {

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const arr = JSON.parse(raw) as Channel[]
    return arr.map(c => ({
      ...c,

    }))

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
      return { created: false, channel: exists }
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
