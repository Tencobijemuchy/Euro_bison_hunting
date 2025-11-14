import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class AuthController {
  // POST /api/auth/register
  async register({ request, response }: HttpContext) {
    try {
      const payload = request.only(['firstName', 'lastName', 'nickname', 'email', 'password'])

      // Validácia
      if (
        !payload.firstName ||
        !payload.lastName ||
        !payload.nickname ||
        !payload.email ||
        !payload.password
      ) {
        return response.badRequest({ message: 'All fields are required' })
      }

      // Skontroluj, či email už existuje
      const existingEmail = await User.query().where('email', payload.email).first()
      if (existingEmail) {
        return response.badRequest({ message: 'Email already exists' })
      }

      // Skontroluj, či nickname už existuje
      const existingNick = await User.query().where('nick_name', payload.nickname).first()
      if (existingNick) {
        return response.badRequest({ message: 'Nickname already exists' })
      }

      // Vytvor usera
      const user = await User.create({
        firstName: payload.firstName,
        lastName: payload.lastName,
        nickName: payload.nickname,
        email: payload.email,
        passwordHash: await hash.make(payload.password),
        status: 'online',
      })

      // Vráť verejné údaje
      return response.created({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickName,
        email: user.email,
      })
    } catch (error) {
      console.error('Registration error:', error)
      return response.internalServerError({ message: 'Registration failed' })
    }
  }

  // POST /api/auth/login
  async login({ request, response }: HttpContext) {
    try {
      const { identifier, password } = request.only(['identifier', 'password'])

      if (!identifier || !password) {
        return response.badRequest({ message: 'Identifier and password are required' })
      }

      // Nájdi usera podľa emailu alebo nicku
      const user = await User.query()
        .where('email', identifier)
        .orWhere('nick_name', identifier)
        .first()

      if (!user) {
        return response.unauthorized({ message: 'Invalid credentials' })
      }

      // Skontroluj heslo
      const isPasswordValid = await hash.verify(user.passwordHash, password)
      if (!isPasswordValid) {
        return response.unauthorized({ message: 'Invalid credentials' })
      }

      // Update status na online
      user.status = 'online'
      await user.save()

      // Vráť verejné údaje
      return response.ok({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickName,
        email: user.email,
        status: user.status,
      })
    } catch (error) {
      console.error('Login error:', error)
      return response.internalServerError({ message: 'Login failed' })
    }
  }

  // POST /api/auth/logout
  async logout({ request, response }: HttpContext) {
    try {
      const { userId } = request.only(['userId'])

      if (userId) {
        const user = await User.find(userId)
        if (user) {
          user.status = 'offline'
          await user.save()
        }
      }

      return response.ok({ message: 'Logged out successfully' })
    } catch (error) {
      console.error('Logout error:', error)
      return response.internalServerError({ message: 'Logout failed' })
    }
  }

  // GET /api/auth/me
  async me({ request, response }: HttpContext) {
    try {
      const userId = request.header('X-User-Id')

      if (!userId) {
        return response.unauthorized({ message: 'Not authenticated' })
      }

      const user = await User.find(userId)

      if (!user) {
        return response.notFound({ message: 'User not found' })
      }

      return response.ok({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickName,
        email: user.email,
        status: user.status,
      })
    } catch (error) {
      console.error('Me error:', error)
      return response.internalServerError({ message: 'Failed to fetch user' })
    }
  }
}
