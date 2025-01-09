import { createLazyFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export default function SlowComponent() {
  const largeArray = Array.from({ length: 1000 }, (_, i) => i)
  const [count, setCount] = useState<number>(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((count) => count + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-wrap overflow-scroll gap-1">
      <div>{count}</div>
      {largeArray.map((value) => (
        <Box key={value} value={value} />
      ))}
    </div>
  )
}

interface BoxProps {
  value: number
}

export const Box = ({ value }: BoxProps): JSX.Element => {
  return (
    <div
      className="w-2 h-2 bg-neutral-700"
      style={{
        backgroundColor: `rgb(${value % 255}, ${(value * 2) % 255}, ${(value * 3) % 255})`,
      }}
    />
  )
}

export const Route = createLazyFileRoute('/big-grid-test')({
  component: SlowComponent,
})
