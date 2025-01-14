import { createLazyFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useMemo } from 'react';
import { useState } from 'react';

export const Route = createLazyFileRoute('/triangle')({
  component: TriangleDemo,
});

const TARGET = 50;

function TriangleDemo() {
  const [elapsed, setElapsed] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const scale = useMemo(() => {
    const e = (elapsed / 1000) % 10;
    return 1 + (e > 5 ? 10 - e : e) / 10;
  }, [elapsed]);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s % 10) + 1), 1000);

    let f: number;
    const start = Date.now();
    const update = () => {
      setElapsed(Date.now() - start);
      f = requestAnimationFrame(update);
    };
    f = requestAnimationFrame(update);

    return () => {
      clearInterval(t);
      cancelAnimationFrame(f);
    };
  }, []);

  return (
    <div
      className="container"
      style={{
        transform: `scaleX(${scale / 2.1}) scaleY(0.7) translateZ(0.1px)`,
      }}
    >
      <Triangle x={500} y={400} s={1000} seconds={seconds} />
    </div>
  );
}

function SlowTriangle({
  x,
  y,
  s,
  seconds,
}: { x: number; y: number; s: number; seconds: number }) {
  s = s / 2;

  const slow = useMemo(() => {
    const e = performance.now() + 0.8;
    // Artificially long execution time.
    while (performance.now() < e) {}
    return seconds;
  }, [seconds]);

  return (
    <div className="w-full h-full">
      <Triangle x={x} y={y - s / 2} s={s} seconds={slow} />
      <Triangle x={x - s} y={y + s / 2} s={s} seconds={slow} />
      <Triangle x={x + s} y={y + s / 2} s={s} seconds={slow} />
    </div>
  );
}

function Triangle({
  x,
  y,
  s,
  seconds,
}: { x: number; y: number; s: number; seconds: number }) {
  if (s <= TARGET) {
    return (
      <Dot x={x - TARGET / 2} y={y - TARGET / 2} s={TARGET} text={seconds} />
    );
  }
  return <SlowTriangle x={x} y={y} s={s} seconds={seconds} />;
}

function Dot({
  x,
  y,
  s,
  text,
}: { x: number; y: number; s: number; text: number }) {
  const [hover, setHover] = useState(false);
  const onEnter = () => setHover(true);
  const onExit = () => setHover(false);

  return (
    <div
      className="dot"
      style={{
        width: `${s}px`,
        height: `${s}px`,
        left: `${x}px`,
        top: `${y}px`,
        borderRadius: `${s / 2}px`,
        lineHeight: `${s}px`,
        background: hover ? '#ff0' : '#61dafb',
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onExit}
    >
      {hover ? `**${text}**` : text}
    </div>
  );
}
