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
const userId = (document.querySelector('meta[name="user-id"]') as any).content
root.render(
  <Provider store={store}>
    {
      userId ? <EmployeeSummaryDashboard userId={userId}/> : <EmployeeSummaryDashboard />
    }
  </Provider>
);

reportWebVitals();
