import React from 'react';
import ReactDOM from 'react-dom/client';
import './main.css';

const PROJECT = 'main';

export const root = ReactDOM.createRoot(document.getElementById('root'));
const render = async () => {
  const Component = (
    await import(
      process.env.NODE_ENV !== 'production' ? `./${PROJECT}.jsx` : './main.jsx'
    )
  ).default;
  root.render(<Component />);
};

render();
