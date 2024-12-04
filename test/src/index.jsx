import {
  instrument,
  traverseFiberRoot,
  getDisplayName,
} from 'bippy/dist/index.mjs';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ObjectInspector } from 'react-inspector';

function A() {
  return <li>A</li>;
}

function B() {
  return <li>B</li>;
}

function C() {
  return <li>C</li>;
}

function Root() {
  return (
    <>
      <h1>bippy example</h1>
      <ul>
        <A />
        <B />
        <C />
      </ul>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);

const data = [];
const NAME_ALLOW_LIST = ['A', 'B', 'C', 'Root'];

instrument({
  onCommitFiberRoot: traverseFiberRoot({
    onRender: (fiber) => {
      const displayName = getDisplayName(fiber);
      if (!displayName || !NAME_ALLOW_LIST.includes(displayName)) return;
      data.push({ displayName, fiber });
    },
  }),
});

ReactDOM.createRoot(document.getElementById('inspector')).render(
  <ObjectInspector data={data} expandLevel={3} />,
);
