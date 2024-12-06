# <img src="https://github.com/aidenybai/bippy/blob/main/.github/assets/bippy.png?raw=true" width="60" align="center" /> bippy

a hacky way to get fibers from react. used internally for [`react-scan`](https://github.com/aidenybai/react-scan).

bippy works by setting a "fake" version of the `__REACT_DEVTOOLS_GLOBAL_HOOK__` object. this gives us access to react internals without actually using react devtools.

> [!WARNING]
> this project uses react internals, which can change at any time. **this is not recommended for usage and may break production apps** - unless you acknowledge this risk and know exactly you're doing.

## example

here i wrote a `getRenderInfo` function, where you're able to pass any component identifier and get back the number of times it rendered, as well as the total and self time. this is done by traversing the fiber tree during a [commit](https://react.dev/learn/render-and-commit) via `onCommitFiberRoot`.

inspect it live [here](https://bippy.million.dev/).

```jsx
import {
  instrument,
  createFiberVisitor,
  getTimings,
  getDisplayName,
} from 'bippy'; // must be imported BEFORE react
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const componentRenderMap = new WeakMap();

const visitor = createFiberVisitor({
  onRender(fiber, phase) {
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
    console.log(phase, render);
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
```

## misc

the original bippy character is owned and created by [@dairyfreerice](https://www.instagram.com/dairyfreerice). this project is not related to the bippy brand, i just think the character is cute
