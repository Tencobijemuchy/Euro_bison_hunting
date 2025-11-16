import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
import type { ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class Channel extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare channelName: string

  @column()
  declare isPrivate: boolean

  @column()
  declare ownerId: number

  @column()
  declare status: 'active' | 'inactive' | 'deleted'

  @column.dateTime()
  declare lastActivityAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relacia: vlastnik kanala
  @belongsTo(() => User, {
    foreignKey: 'ownerId',
  })
  declare owner: BelongsTo<typeof User>

  // M:N relacia: clenovia kanala cez pivot table channel_user
  @manyToMany(() => User, {
    pivotTable: 'channel_user',
    pivotForeignKey: 'channel_id',
    pivotRelatedForeignKey: 'user_id',
    pivotTimestamps: true,
    pivotColumns: ['kick_count', 'is_banned', 'joined_at'],
  })
  declare members: ManyToMany<typeof User>}
