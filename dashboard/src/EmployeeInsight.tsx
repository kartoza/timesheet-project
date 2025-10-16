import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import './index.scss';
import reportWebVitals from './reportWebVitals';
import { store } from './app/store';
import EmployeeSummaryDashboard from "./components/EmployeeInsight";


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <Provider store={store}>
    <EmployeeSummaryDashboard defaultFrom="2025-10-01" defaultTo="2025-10-10" />
  </Provider>
);

reportWebVitals();
