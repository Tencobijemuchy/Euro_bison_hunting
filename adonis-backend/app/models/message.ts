import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Channel from './channel.js'
import User from './user.js'

export default class Message extends BaseModel {
  public static table = 'messages'

  @column({ isPrimary: true })
  public id!: number

  @column()
  public channelId!: number

  // v DB je author_id
  @column()
  public authorId!: number

  // v DB je mentioned_user_id a môže byť NULL
  @column()
  public mentionedUserId: number | null = null

  // v DB je body
  @column()
  public body!: string

  @column.dateTime({ autoCreate: true })
  public createdAt!: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt!: DateTime

  @belongsTo(() => Channel)
  public channel!: BelongsTo<typeof Channel>

  @belongsTo(() => User, { foreignKey: 'authorId' })
  public author!: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'mentionedUserId' })
  public mentionedUser!: BelongsTo<typeof User>
}
