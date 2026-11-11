import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import type { MailCounts, MailFolder, MailReadStore, Slugs } from '../types.js'

const states: Partial<Record<MailFolder, string[]>> = {
  drafts: ['draft'],
  sent: ['provider-accepted', 'delivered-to-recipient-server', 'delayed'],
  queued: ['queued', 'submitting', 'delayed'],
  failed: ['failed', 'bounced', 'ambiguous'],
}

/** Resolve only configured collection identifiers; all request values are bound parameters. */
function tables(db: SQLiteAdapter, slugs: Slugs) {
  if (db.name !== 'sqlite') throw new Error('mail:unsupported-adapter')
  const table = (slug: string) => {
    if (!/^[a-z][a-z0-9-]{0,47}$/.test(slug)) throw new Error('mail:invalid-table')
    const name = db.tableNameMap.get(slug.replaceAll('-', '_'))
    if (!name || !/^[a-z0-9_]+$/.test(name)) throw new Error('mail:invalid-table')
    return `"${name}"`
  }
  return { conversations: table(slugs.conversations), messages: table(slugs.messages) }
}

/** One bounded index query plus COUNT; avoids an inbox request per conversation. */
export function sqliteMailQueries(): MailReadStore {
  return {
    async list(payload, slugs, mailboxKeys, query) {
      if (!mailboxKeys.length) return { items: [], totalDocs: 0 }
      const db = payload.db as unknown as SQLiteAdapter
      const { conversations, messages } = tables(db, slugs)
      const slots = mailboxKeys.map(() => '?').join(',')
      const messageFolder = !!states[query.folder]
      const conditions = [`c.mailbox IN (${slots})`]
      const args: (string | number)[] = [...mailboxKeys]
      const like = (value: string) =>
        `%${value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
      const hasIncoming = `EXISTS (SELECT 1 FROM ${messages} received WHERE received.conversation = CAST(c.id AS TEXT) AND received.mailbox = c.mailbox AND received.kind = 'incoming')`
      if (query.folder === 'inbox') conditions.push(`c.status = 'open' AND ${hasIncoming}`)
      if (query.folder === 'archived') conditions.push("c.status = 'closed'")
      if (query.unread) conditions.push('c.unread = 1')
      if (query.status) {
        conditions.push('c.status = ?')
        args.push(query.status)
      }
      const messagePredicates: string[] = []
      const messageArgs: (string | number)[] = []
      if (query.sender) {
        messagePredicates.push("json_extract(m.data, '$.from') LIKE ? ESCAPE '\\'")
        messageArgs.push(like(query.sender))
      }
      if (query.recipient) {
        messagePredicates.push(
          "EXISTS (SELECT 1 FROM json_each(m.data, '$.to') recipient WHERE recipient.value LIKE ? ESCAPE '\\')",
        )
        messageArgs.push(like(query.recipient))
      }
      if (query.delivery) {
        messagePredicates.push('m.state = ?')
        messageArgs.push(query.delivery)
      }
      if (query.after) {
        messagePredicates.push('m.created_at >= ?')
        messageArgs.push(query.after)
      }
      if (query.before) {
        messagePredicates.push('m.created_at < ?')
        messageArgs.push(query.before)
      }
      let from = `${conversations} c`
      let columns = `c.id, c.id AS conversation_id, (SELECT recent.id FROM ${messages} recent WHERE recent.conversation = CAST(c.id AS TEXT) AND recent.mailbox = c.mailbox ORDER BY recent.created_at DESC, recent.id DESC LIMIT 1) AS message_id`
      let order = 'c.updated_at DESC, c.id DESC'
      if (messageFolder) {
        from = `${messages} m JOIN ${conversations} c ON m.conversation = CAST(c.id AS TEXT) AND m.mailbox = c.mailbox`
        columns = 'm.id, c.id AS conversation_id, m.id AS message_id'
        order = 'm.created_at DESC, m.id DESC'
        const allowed = states[query.folder]!
        conditions.push(`m.kind = 'outgoing' AND m.state IN (${allowed.map(() => '?').join(',')})`)
        args.push(...allowed)
        if (query.search) {
          conditions.push(
            "(json_extract(m.data, '$.subject') LIKE ? ESCAPE '\\' OR json_extract(m.data, '$.from') LIKE ? ESCAPE '\\')",
          )
          args.push(like(query.search), like(query.search))
        }
        conditions.push(...messagePredicates)
        args.push(...messageArgs)
      } else {
        if (query.search) {
          conditions.push("(c.subject LIKE ? ESCAPE '\\' OR c.sender LIKE ? ESCAPE '\\')")
          args.push(like(query.search), like(query.search))
        }
        if (messagePredicates.length) {
          conditions.push(
            `EXISTS (SELECT 1 FROM ${messages} m WHERE m.conversation = CAST(c.id AS TEXT) AND m.mailbox = c.mailbox AND ${messagePredicates.join(' AND ')})`,
          )
          args.push(...messageArgs)
        }
      }
      const where = conditions.join(' AND ')
      const total = await db.client.execute({
        sql: `SELECT COUNT(*) AS count FROM ${from} WHERE ${where}`,
        args,
      })
      const rows = await db.client.execute({
        sql: `SELECT ${columns} FROM ${from} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
        args: [...args, query.pageSize, (query.page - 1) * query.pageSize],
      })
      return {
        totalDocs: Number(total.rows[0].count),
        items: rows.rows.map((row) => ({
          id: String(row.id),
          conversationId: String(row.conversation_id),
          ...(row.message_id == null ? {} : { messageId: String(row.message_id) }),
        })),
      }
    },
    async counts(payload, slugs, mailboxKeys) {
      const result: MailCounts = {
        inbox: 0,
        unread: 0,
        all: 0,
        drafts: 0,
        sent: 0,
        queued: 0,
        failed: 0,
        archived: 0,
      }
      if (!mailboxKeys.length) return result
      const db = payload.db as unknown as SQLiteAdapter
      const { conversations, messages } = tables(db, slugs)
      const slots = mailboxKeys.map(() => '?').join(',')
      const rows = await db.client.execute({
        sql: `SELECT 'conversation' AS kind, c.status AS state, COUNT(*) AS count, SUM(c.unread) AS unread, SUM(CASE WHEN EXISTS (SELECT 1 FROM ${messages} m WHERE m.conversation = CAST(c.id AS TEXT) AND m.mailbox = c.mailbox AND m.kind = 'incoming') THEN 1 ELSE 0 END) AS incoming, SUM(CASE WHEN c.unread = 1 AND EXISTS (SELECT 1 FROM ${messages} m WHERE m.conversation = CAST(c.id AS TEXT) AND m.mailbox = c.mailbox AND m.kind = 'incoming') THEN 1 ELSE 0 END) AS incoming_unread FROM ${conversations} c WHERE c.mailbox IN (${slots}) GROUP BY c.status UNION ALL SELECT kind, state, COUNT(*), 0, 0, 0 FROM ${messages} WHERE mailbox IN (${slots}) AND kind = 'outgoing' GROUP BY kind, state`,
        args: [...mailboxKeys, ...mailboxKeys],
      })
      for (const row of rows.rows) {
        if (row.kind === 'conversation') {
          result.all += Number(row.count)
          if (row.state === 'closed') result.archived += Number(row.count)
          else {
            result.inbox += Number(row.incoming)
            result.unread += Number(row.incoming_unread)
          }
        } else {
          for (const [folder, allowed] of Object.entries(states))
            if (allowed.includes(String(row.state)))
              result[folder as MailFolder] += Number(row.count)
        }
      }
      return result
    },
  }
}
