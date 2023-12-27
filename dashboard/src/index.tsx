import React, {Suspense} from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import './index.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { store } from './app/store';
import ErrorBoundary from "./components/ErrorBoundary";
import Loader from "./loadable/Loader";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <Provider store={store}>
      <ErrorBoundary>
        <Suspense fallback={<Loader/>}>
          <App/>
        </Suspense>
      </ErrorBoundary>
  </Provider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
