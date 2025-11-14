/*
export type MockUser = {
  id: number
  firstName: string
  lastName: string
  nickname: string
  email: string
  password: string
  createdAt: string
}

const KEY = 'user_auth'

function loadUsers(): MockUser[] {
  const raw = localStorage.getItem(KEY)
  return raw ? (JSON.parse(raw) as MockUser[]) : []
}

function saveUsers(users: MockUser[]) {
  localStorage.setItem(KEY, JSON.stringify(users))
}

export function registerUser(payload: Omit<MockUser, 'id' | 'createdAt'>): MockUser {
  const users = loadUsers()
  if (users.some(u => u.email.toLowerCase() === payload.email.toLowerCase()))
    throw new Error('email already exists')
  if (users.some(u => u.nickname.toLowerCase() === payload.nickname.toLowerCase()))
    throw new Error('nickname already exists')

  const user: MockUser = {
    ...payload,
    id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  saveUsers(users)
  return user
}

export function authenticateUser(identifier: string, password: string): MockUser {
  const users = loadUsers()
  const found = users.find(
    u =>
      (u.email.toLowerCase() === identifier.toLowerCase() ||
        u.nickname.toLowerCase() === identifier.toLowerCase()) &&
      u.password === password
  )
  if (!found) throw new Error('zle meno/heslo alebo si sa neregistroval ')
  return found
}
*/
