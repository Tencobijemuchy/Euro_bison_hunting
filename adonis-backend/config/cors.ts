import { defineConfig } from '@adonisjs/cors'

export default defineConfig({
  origin: ['http://localhost:9000'],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})
