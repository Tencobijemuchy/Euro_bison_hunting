import { defineStore } from 'pinia'
import { Notify } from 'quasar'
import axios, { AxiosError } from 'axios'

// API base URL
const API_URL = 'http://localhost:3333/api'

type UserPublic = {
  id: number
  firstName: string
  lastName: string
  nickname: string
  email: string
  status?: 'online' | 'dnd' | 'offline'
  notifications?: 'all' | 'mentions' | 'off'
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

    async register(payload: {
      firstName: string
      lastName: string
      nickname: string
      email: string
      password: string
    }) {
      try {
        const response = await axios.post(`${API_URL}/auth/register`, payload)
        const user: UserPublic = response.data

        this.me = user
        this.persistSession()

        Notify.create({
          type: 'positive',
          message: 'Registration successful'
        })
      } catch (error) {
        const message = error instanceof AxiosError
          ? error.response?.data?.message || 'Registration failed'
          : 'Registration failed'
        Notify.create({
          type: 'negative',
          message
        })
        throw error
      }
    },

    async login(identifier: string, password: string) {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          identifier,
          password,
        })
        const user: UserPublic = response.data

        this.me = user
        this.persistSession()

        Notify.create({
          type: 'positive',
          message: `Welcome, ${user.nickname}`
        })
      } catch (error) {
        const message = error instanceof AxiosError
          ? error.response?.data?.message || 'Login failed'
          : 'Login failed'
        Notify.create({
          type: 'negative',
          message
        })
        throw error
      }
    },

    async logout() {
      try {
        if (this.me) {
          await axios.post(`${API_URL}/auth/logout`, {
            userId: this.me.id,
          })
        }

        this.me = null
        localStorage.removeItem(SESSION_KEY)

        Notify.create({
          type: 'info',
          message: 'Logged out'
        })
      } catch {
        // Aj keď API zlyhá, odhláš sa lokálne
        this.me = null
        localStorage.removeItem(SESSION_KEY)

        Notify.create({
          type: 'info',
          message: 'Logged out'
        })
      }
    },
    async updateSettings(status?: 'online' | 'dnd' | 'offline', notifications?: 'all' | 'mentions' | 'off') {
      try {
        if (!this.me) return

        const response = await axios.patch(`${API_URL}/auth/update-settings`, {
          userId: this.me.id,
          status,
          notifications,
        })

        // Aktualizuj lokálny stav
        if (this.me) {
          if (status) this.me.status = status
          if (response.data.notifications && this.me) {
            this.me.notifications = response.data.notifications
          }
          this.persistSession()
        }
      } catch (error) {
        console.error('Update settings error:', error)
      }
    },
  },
})
