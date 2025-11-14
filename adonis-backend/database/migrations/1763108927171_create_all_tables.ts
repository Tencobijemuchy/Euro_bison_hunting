import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'irc_chat_schema'

  async up() {
    // ========================================
    // faza 1 vsetky tabulky
    // ========================================

    // 1. Table Users
    this.schema.createTable('users', (table) => {
      table.increments('id').primary()
      table.string('first_name', 100).notNullable()
      table.string('last_name', 100).notNullable()
      table.string('nick_name', 50).notNullable().unique()
      table.string('email', 255).notNullable().unique()
      table.string('password_hash', 255).notNullable()
      table.enum('status', ['online', 'dnd', 'offline']).defaultTo('online')
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    // 2. Table Channels
    this.schema.createTable('channels', (table) => {
      table.increments('id').primary()
      table.string('channel_name', 100).notNullable().unique()
      table.boolean('is_private').defaultTo(false)
      table.integer('owner_id').unsigned().notNullable()
      table.enum('status', ['active', 'inactive', 'deleted']).defaultTo('active')
      table.timestamp('last_activity_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    // 3. Table Messages
    this.schema.createTable('messages', (table) => {
      table.increments('id').primary()
      table.integer('channel_id').unsigned().notNullable()
      table.integer('author_id').unsigned().notNullable()
      table.text('body').notNullable()
      table.integer('mentioned_user_id').unsigned().nullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    // 4. Table Invitations
    this.schema.createTable('invitations', (table) => {
      table.increments('id').primary()
      table.integer('channel_id').unsigned().notNullable()
      table.integer('inviter_id').unsigned().notNullable()
      table.integer('invitee_id').unsigned().notNullable()
      table.enum('status', ['pending', 'accepted', 'rejected']).defaultTo('pending')
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    // 5. Pivot Table - channel_user (M:N vzťah)
    this.schema.createTable('channel_user', (table) => {
      table.increments('id').primary()
      table.integer('user_id').unsigned().notNullable()
      table.integer('channel_id').unsigned().notNullable()
      table.integer('kick_count').defaultTo(0)
      table.boolean('is_banned').defaultTo(false)
      table.timestamp('joined_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    // 6. Table pre typing indicators
    this.schema.createTable('typing_indicators', (table) => {
      table.increments('id').primary()
      table.integer('user_id').unsigned().notNullable()
      table.integer('channel_id').unsigned().notNullable()
      table.text('current_text').nullable()
      table.timestamp('last_typed_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    // 7. Table pre user settings
    this.schema.createTable('user_settings', (table) => {
      table.increments('id').primary()
      table.integer('user_id').unsigned().notNullable().unique()
      table.boolean('notifications_only_mentions').defaultTo(false)
      table.boolean('notifications_enabled').defaultTo(true)
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    // ========================================
    // faza 2: Pridanie foreign keys a constraints
    // ========================================

    // Foreign keys pre Channels tabuľku
    this.schema.alterTable('channels', (table) => {
      table.foreign('owner_id').references('id').inTable('users').onDelete('CASCADE')
    })

    // Foreign keys pre Messages tabuľku
    this.schema.alterTable('messages', (table) => {
      table.foreign('channel_id').references('id').inTable('channels').onDelete('CASCADE')
      table.foreign('author_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('mentioned_user_id').references('id').inTable('users').onDelete('SET NULL')
    })

    // Foreign keys a unique constraint pre Invitations tabuľku
    this.schema.alterTable('invitations', (table) => {
      table.foreign('channel_id').references('id').inTable('channels').onDelete('CASCADE')
      table.foreign('inviter_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('invitee_id').references('id').inTable('users').onDelete('CASCADE')
      table.unique(['channel_id', 'invitee_id'])
    })

    // Foreign keys a unique constraint pre channel_user pivot tabuľku
    this.schema.alterTable('channel_user', (table) => {
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('channel_id').references('id').inTable('channels').onDelete('CASCADE')
      table.unique(['user_id', 'channel_id'])
    })

    // Foreign keys a unique constraint pre typing_indicators tabuľku
    this.schema.alterTable('typing_indicators', (table) => {
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('channel_id').references('id').inTable('channels').onDelete('CASCADE')
      table.unique(['user_id', 'channel_id'])
    })

    // Foreign key pre user_settings tabuľku
    this.schema.alterTable('user_settings', (table) => {
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
    })
  }

  async down() {
    // Mazanie v opačnom poradí - najprv odobrať foreign keys, potom tabuľky

    // Odobrať foreign keys
    this.schema.alterTable('user_settings', (table) => {
      table.dropForeign(['user_id'])
    })

    this.schema.alterTable('typing_indicators', (table) => {
      table.dropForeign(['user_id'])
      table.dropForeign(['channel_id'])
    })

    this.schema.alterTable('channel_user', (table) => {
      table.dropForeign(['user_id'])
      table.dropForeign(['channel_id'])
    })

    this.schema.alterTable('invitations', (table) => {
      table.dropForeign(['channel_id'])
      table.dropForeign(['inviter_id'])
      table.dropForeign(['invitee_id'])
    })

    this.schema.alterTable('messages', (table) => {
      table.dropForeign(['channel_id'])
      table.dropForeign(['author_id'])
      table.dropForeign(['mentioned_user_id'])
    })

    this.schema.alterTable('channels', (table) => {
      table.dropForeign(['owner_id'])
    })

    // Vymazať tabuľky
    this.schema.dropTableIfExists('user_settings')
    this.schema.dropTableIfExists('typing_indicators')
    this.schema.dropTableIfExists('channel_user')
    this.schema.dropTableIfExists('invitations')
    this.schema.dropTableIfExists('messages')
    this.schema.dropTableIfExists('channels')
    this.schema.dropTableIfExists('users')
  }
}
