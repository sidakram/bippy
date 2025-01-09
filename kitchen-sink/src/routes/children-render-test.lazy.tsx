import { createLazyFileRoute } from '@tanstack/react-router'
import React, { type ReactNode } from 'react'
import {
  instrument,
  createFiberVisitor,
  getDisplayName,
  isCompositeFiber,
  type Fiber,
} from 'bippy'

const visit = createFiberVisitor({
  onRender(fiber: Fiber) {
    if (isCompositeFiber(fiber)) {
      console.count(`recieved ${getDisplayName(fiber.type)}`)
    }
  },
  onError: (error: unknown) => {
    console.error('Fiber visitor error:', error)
    return error
  },
})

instrument({
  onCommitFiberRoot: (rendererID: number, fiberRoot: Fiber) => {
    visit(rendererID, fiberRoot)
  },
})

interface PassthroughChildrenProps {
  children: ReactNode
}

function PassthroughChildren({ children }: PassthroughChildrenProps) {
  console.count('sent PassthroughChildren')
  return <div>{children}</div>
}

function BasicComponent() {
  console.count('sent BasicComponent')
  return <div>BasicComponent</div>
}

export default function ChildrenRenderTest() {
  console.count('sent ChildrenRenderTest')
  return (
    <PassthroughChildren>
      <PassthroughChildren>
        <BasicComponent />
      </PassthroughChildren>
    </PassthroughChildren>
  )
}

export const Route = createLazyFileRoute('/children-render-test')({
  component: ChildrenRenderTest,
})
