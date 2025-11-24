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
      table.enum('status', ['online', 'dnd', 'offline'])
      table.enum('notifications', ['all', 'mentions', 'off']).defaultTo('all')
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

    // 7. Table pre kick votes - ✅ PRIDANÉ
    this.schema.createTable('kick_votes', (table) => {
      table.increments('id').primary()
      table.integer('channel_id').unsigned().notNullable()
      table.integer('voter_user_id').unsigned().notNullable()
      table.integer('target_user_id').unsigned().notNullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
    })

    // ========================================
    // faza 2: Pridanie foreign keys a constraints
    // ========================================

    // Foreign keys pre Channels
    this.schema.alterTable('channels', (table) => {
      table.foreign('owner_id').references('id').inTable('users').onDelete('CASCADE')
    })

    // Foreign keys pre Messages
    this.schema.alterTable('messages', (table) => {
      table.foreign('channel_id').references('id').inTable('channels').onDelete('CASCADE')
      table.foreign('author_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('mentioned_user_id').references('id').inTable('users').onDelete('SET NULL')
    })

    // Foreign keys a unique constraint pre Invitations
    this.schema.alterTable('invitations', (table) => {
      table.foreign('channel_id').references('id').inTable('channels').onDelete('CASCADE')
      table.foreign('inviter_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('invitee_id').references('id').inTable('users').onDelete('CASCADE')
      table.unique(['channel_id', 'invitee_id'])
    })

    // Foreign keys a unique constraint pre channel_user
    this.schema.alterTable('channel_user', (table) => {
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('channel_id').references('id').inTable('channels').onDelete('CASCADE')
      table.unique(['user_id', 'channel_id'])
    })

    // Foreign keys a unique constraint pre typing_indicators
    this.schema.alterTable('typing_indicators', (table) => {
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('channel_id').references('id').inTable('channels').onDelete('CASCADE')
      table.unique(['user_id', 'channel_id'])
    })

    // Foreign keys a unique constraint pre kick_votes - ✅ PRIDANÉ
    this.schema.alterTable('kick_votes', (table) => {
      table.foreign('channel_id').references('id').inTable('channels').onDelete('CASCADE')
      table.foreign('voter_user_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('target_user_id').references('id').inTable('users').onDelete('CASCADE')
      // Každý voter môže mať len 1 vote na target v danom channeli
      table.unique(['channel_id', 'voter_user_id', 'target_user_id'])
    })
  }
}
