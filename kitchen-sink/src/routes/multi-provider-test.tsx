import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
import {
  instrument,
  createFiberVisitor,
  getDisplayName,
  type Fiber,
  type RenderHandler,
} from 'bippy'

const visit = createFiberVisitor({
  onRender(fiber: Fiber) {
    console.log(fiber)
    console.count(`recieved ${getDisplayName(fiber.type)}`)
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

const CountContext = React.createContext<number>(0)
const ExtraContext = React.createContext<number>(0)

interface ComplexComponentProps {
  countProp: number
}

function ComplexComponent({ countProp }: ComplexComponentProps) {
  console.count('sent ComplexComponent')
  return <div>ComplexComponent</div>
}

export default function MultiProviderTest() {
  console.count('sent MultiProviderTest')
  return (
    <CountContext.Provider value={5}>
      <ExtraContext.Provider value={10}>
        <ComplexComponent countProp={2} />
      </ExtraContext.Provider>
    </CountContext.Provider>
  )
}

export const Route = createFileRoute('/multi-provider-test')({
  component: MultiProviderTest,
})
