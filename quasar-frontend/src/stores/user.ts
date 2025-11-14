import { defineStore } from 'pinia'
import { Notify } from 'quasar'
import { authenticateUser, registerUser, type MockUser } from 'src/utils/user_authentication'

type UserPublic = {
  id: number
  firstName: string
  lastName: string
  nickname: string
  email: string
}

const SESSION_KEY = 'session_user'

export const useUserStore = defineStore('user', {
  state: () => ({
    me: null as UserPublic | null,
  }),
  getters: {
    isLogged: (s) => s.me !== null,
    fullName: (s) => (s.me ? `${s.me.firstName} ${s.me.lastName}` : ''),
  },
  actions: {
    persistSession() {
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.me))
    },

    loadSession() {
      const raw = localStorage.getItem(SESSION_KEY)
      this.me = raw ? (JSON.parse(raw) as UserPublic) : null
    },

    register(payload: {
      firstName: string
      lastName: string
      nickname: string
      email: string
      password: string
    }) {
      const created: MockUser = registerUser(payload)
      const pub: UserPublic = {
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        nickname: created.nickname,
        email: created.email,
      }
      this.me = pub
      this.persistSession()
      Notify.create({ type: 'positive', message: 'Registration successful' })
    },

    login(identifier: string, password: string) {
      const u: MockUser = authenticateUser(identifier, password)
      const pub: UserPublic = {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        nickname: u.nickname,
        email: u.email,
      }
      this.me = pub
      this.persistSession()
      Notify.create({ type: 'positive', message: `Welcome, ${pub.nickname}` })
    },

    logout() {
      this.me = null
      localStorage.removeItem(SESSION_KEY)
      Notify.create({ type: 'info', message: 'Logged out' })
    },
  },
})
