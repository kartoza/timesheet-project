import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import reportWebVitals from './reportWebVitals';
import PMODashboardApp from './components/pmo_dashboard/PMODashboardApp';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <PMODashboardApp />
  </React.StrictMode>
);

reportWebVitals();
