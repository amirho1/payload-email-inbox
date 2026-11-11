/* Adapted from shadcn/ui radix registry; MIT. react-resizable-panels v4 API. */
'use client'

import { cn } from '../utils.js'
import React from 'react'
import { GripVertical } from 'lucide-react'
import * as ResizablePrimitive from 'react-resizable-panels'

function ResizablePanelGroup({ className, ...props }: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        'pm:flex pm:h-full pm:w-full pm:aria-[orientation=vertical]:flex-col',
        className,
      )}
      {...props}
    />
  )
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        'pm:relative pm:flex pm:w-px pm:items-center pm:justify-center pm:bg-border pm:ring-offset-background pm:after:absolute pm:after:inset-y-0 pm:after:left-1/2 pm:after:w-1 pm:after:-translate-x-1/2 pm:focus-visible:ring-1 pm:focus-visible:ring-ring pm:focus-visible:outline-hidden',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="pm:z-10 pm:flex pm:shrink-0 pm:rounded-sm pm:border pm:bg-border">
          <GripVertical className="pm:h-4 pm:w-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
