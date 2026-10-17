import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FlowProvider } from './lib/store';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FlowProvider>
      <App />
    </FlowProvider>
  </React.StrictMode>,
);
