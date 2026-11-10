import type { Payload, PayloadRequest, Where } from 'payload'
import type { AtomicPatch, MailID, ResolvedOptions } from '../types.js'
import { MailError } from './errors.js'

// Dynamic collection slugs cannot be described by a consumer's generated Payload union.
// Keep the conversion at this boundary; runtime configs and returned schemas are ours.
export type Row = Record<string, unknown> & { id: MailID; revision: number }

export class MailStore {
  constructor(
    public payload: Payload,
    public options: ResolvedOptions,
  ) {}

  async find(
    collection: string,
    where: Where,
    limit = 25,
    req?: PayloadRequest,
    page = 1,
    sort = '-createdAt',
  ) {
    return this.payload.find({
      collection,
      where,
      limit,
      page,
      sort,
      depth: 0,
      overrideAccess: !req,
      ...(req ? { req } : {}),
    })
  }

  async get(collection: string, id: MailID, req?: PayloadRequest): Promise<Row> {
    const result = await this.find(collection, { id: { equals: id } }, 1, req)
    if (!result.docs[0]) throw new MailError('notFound', 404)
    return result.docs[0] as Row
  }

  /** Internal writes only, invoked after service authorization or trusted worker validation. */
  async create(collection: string, data: Record<string, unknown>): Promise<Row> {
    return (await this.payload.create({
      collection,
      data,
      overrideAccess: true,
      disableTransaction: true,
      depth: 0,
    })) as Row
  }

  /** Database uniqueness handles parallel inserts; only exact duplicates are returned. */
  async unique(
    collection: string,
    keyField: string,
    key: string,
    data: Record<string, unknown>,
  ): Promise<Row> {
    try {
      return await this.create(collection, { ...data, [keyField]: key })
    } catch (error) {
      const found = await this.find(collection, { [keyField]: { equals: key } }, 1)
      if (!found.docs[0]) throw error
      return found.docs[0] as Row
    }
  }

  async cas(collection: string, row: Row, patch: AtomicPatch): Promise<boolean> {
    return this.options.atomic.compareAndSwap(this.payload, collection, row.id, row.revision, patch)
  }

  /** Bounded optimistic retries preserve concurrent read-state, notes and delivery events. */
  async mutate(
    collection: string,
    id: MailID,
    patch: (row: Row) => AtomicPatch | undefined,
  ): Promise<Row> {
    for (let i = 0; i < 8; i++) {
      const row = await this.get(collection, id)
      const data = patch(row)
      if (!data) return row
      if (await this.cas(collection, row, data))
        return { ...row, ...data, revision: row.revision + 1 }
    }
    throw new MailError('conflict', 409)
  }
}
