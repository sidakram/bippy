import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'

export default function Counter() {
  'use scan'
  const [count, setCount] = useState<number>(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((count) => count + 1)
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return <div className="counter">{count}</div>
}

export const Route = createFileRoute('/button-test')({
  component: Counter,
})
