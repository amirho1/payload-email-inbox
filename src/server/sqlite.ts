import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import type { AtomicStore } from '../types.js'
import { sqliteMailQueries } from './sqlite-queries.js'

/** SQLite 3.90.2 only. One conditional statement; Payload bulk updates are not atomic CAS. */
export function sqliteAtomicStore(): AtomicStore {
  return {
    read: sqliteMailQueries(),
    async pruneConversation(payload, slugs, id, before) {
      const db = payload.db as unknown as SQLiteAdapter
      if (db.name !== 'sqlite') throw new Error('mail:unsupported-adapter')
      const table = (slug: string) => {
        if (!/^[a-z][a-z0-9-]{0,47}$/.test(slug)) throw new Error('mail:invalid-table')
        const name = db.tableNameMap.get(slug.replaceAll('-', '_'))
        if (!name || !/^[a-z0-9_]+$/.test(name)) throw new Error('mail:invalid-table')
        return `"${name}"`
      }
      const conversations = table(slugs.conversations),
        messages = table(slugs.messages)
      const tx = await db.client.transaction('write')
      try {
        const eligible = await tx.execute({
          sql: `SELECT id FROM ${conversations} WHERE id = ? AND status = 'closed' AND updated_at < ? AND NOT EXISTS (SELECT 1 FROM ${messages} WHERE conversation = ? AND kind = 'outgoing' AND state IN ('draft','queued','submitting','ambiguous'))`,
          args: [id, before, String(id)],
        })
        if (!eligible.rows.length) {
          await tx.rollback()
          return false
        }
        // Bound one conversation's deletion, preserving larger threads for a deliberate export.
        const count = await tx.execute({
          sql: `SELECT count(*) AS count FROM ${messages} WHERE conversation = ?`,
          args: [String(id)],
        })
        if (Number(count.rows[0].count) > 100) {
          await tx.rollback()
          return false
        }
        await tx.execute({
          sql: `DELETE FROM ${messages} WHERE conversation = ?`,
          args: [String(id)],
        })
        await tx.execute({ sql: `DELETE FROM ${conversations} WHERE id = ?`, args: [id] })
        await tx.commit()
        return true
      } catch (error) {
        await tx.rollback()
        throw error
      } finally {
        tx.close()
      }
    },
    async compareAndSwap(payload, collection, id, revision, patch) {
      const db = payload.db as unknown as SQLiteAdapter
      if (db.name !== 'sqlite' || !db.client) throw new Error('mail:unsupported-adapter')
      if (!/^[a-z][a-z0-9-]{0,47}$/.test(collection)) throw new Error('mail:invalid-table')
      const table = db.tableNameMap.get(collection.replaceAll('-', '_'))
      if (!table || !/^[a-z0-9_]+$/.test(table)) throw new Error('mail:invalid-table')
      const columns: Record<string, string> = {
        state: 'state',
        data: 'data',
        lease: 'lease',
        leaseUntil: 'lease_until',
        nextAttempt: 'next_attempt',
        attempts: 'attempts',
        conversation: 'conversation',
        unread: 'unread',
        status: 'status',
        subject: 'subject',
        participants: 'participants',
      }
      const entries = Object.entries(patch)
      if (!entries.length || entries.some(([k]) => !columns[k]))
        throw new Error('mail:invalid-patch')
      const result = await db.client.execute({
        sql: `UPDATE "${table}" SET ${entries.map(([k]) => `"${columns[k]}" = ?`).join(', ')}, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? RETURNING id`,
        args: [
          ...entries.map(([, v]) =>
            typeof v === 'object' && v !== null
              ? JSON.stringify(v)
              : typeof v === 'boolean'
                ? Number(v)
                : v,
          ),
          new Date().toISOString(),
          id,
          revision,
        ],
      })
      return result.rows.length === 1
    },
  }
}
