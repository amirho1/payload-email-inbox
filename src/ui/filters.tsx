'use client'
import React, { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { MailState } from './navigation.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/dialog.js'
import { Button } from './components/button.js'
import { Input } from './components/input.js'
import { Choice, IconButton } from './controls.js'

/** Apply advanced filters as one query; the separate list search remains debounced. */
export function MailFilters({ state: s }: { state: MailState }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(s.query)
  const { t } = s
  const states = [
    'draft',
    'queued',
    'submitting',
    'provider-accepted',
    'delivered-to-recipient-server',
    'delayed',
    'failed',
    'bounced',
    'ambiguous',
  ] as const
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(s.query)
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <IconButton icon={SlidersHorizontal} label={t.filters} />
      </DialogTrigger>
      <DialogContent className="pm:max-h-[90dvh] pm:w-[calc(100%-2rem)] pm:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.filters}</DialogTitle>
          <DialogDescription>{t.filterHelp}</DialogDescription>
        </DialogHeader>
        <form
          className="pm:grid pm:gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            s.setQuery({ ...draft, page: 1 })
            setOpen(false)
          }}
        >
          {(['sender', 'recipient'] as const).map((name) => (
            <label key={name} className="pm:grid pm:gap-2">
              {name === 'sender' ? t.from : t.to}
              <Input
                dir="ltr"
                value={draft[name]}
                maxLength={120}
                autoComplete="off"
                onChange={(e) => setDraft((q) => ({ ...q, [name]: e.target.value }))}
              />
            </label>
          ))}
          <Choice
            label={t.status}
            value={draft.delivery}
            onChange={(delivery) => setDraft((q) => ({ ...q, delivery }))}
            options={[
              { value: '', label: t.anyStatus },
              ...states.map((value) => ({ value, label: t[value] })),
            ]}
          />
          <Choice
            label={t.allStatuses}
            value={draft.status}
            onChange={(status) => setDraft((q) => ({ ...q, status }))}
            options={[
              { value: '', label: t.allStatuses },
              { value: 'open', label: t.open },
              { value: 'closed', label: t.closed },
            ]}
          />
          <div className="pm:grid pm:gap-4 pm:sm:grid-cols-2">
            {(['after', 'before'] as const).map((name) => (
              <label key={name} className="pm:grid pm:gap-2">
                {t[name]}
                <Input
                  type="date"
                  dir="ltr"
                  value={draft[name]}
                  onChange={(e) => setDraft((q) => ({ ...q, [name]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setDraft((q) => ({
                  ...q,
                  sender: '',
                  recipient: '',
                  after: '',
                  before: '',
                  delivery: '',
                  status: '',
                }))
              }
            >
              {t.clearFilters}
            </Button>
            <Button type="submit">{t.applyFilters}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
