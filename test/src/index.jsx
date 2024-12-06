import {
  instrument,
  createRenderVisitor,
  getTimings,
  getDisplayName,
} from 'bippy'; // must be imported BEFORE react
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const componentRenderMap = new WeakMap();

const visitor = createRenderVisitor({
  onRender(fiber) {
    const componentType = fiber.elementType;
    if (
      typeof componentType !== 'function' &&
      (typeof componentType !== 'object' || !componentType)
    ) {
      return;
    }
    const render = componentRenderMap.get(componentType) || {
      count: 0,
      selfTime: 0,
      totalTime: 0,
      displayName: getDisplayName(componentType),
    };
    render.count++;
    const { selfTime, totalTime } = getTimings(fiber);
    render.selfTime += selfTime;
    render.totalTime += totalTime;
    componentRenderMap.set(componentType, render);
  },
});

instrument({
  onCommitFiberRoot: (rendererID, fiberRoot) => {
    visitor(rendererID, fiberRoot);
  },
});

export const getRenderInfo = (componentType) => {
  return componentRenderMap.get(componentType);
};

function App() {
  const [count, setCount] = useState(0);
  const renderInfo = getRenderInfo(App);
  return (
    <button onClick={() => setCount(count + 1)}>
      rendered: {JSON.stringify(renderInfo, null, 2)}
    </button>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);