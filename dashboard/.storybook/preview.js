import React, { Suspense } from 'react';
import { Provider } from 'react-redux';

import '../src/index.scss';
import { store } from '../src/app/store';
import ErrorBoundary from '../src/components/ErrorBoundary';
import Loader from '../src/loadable/Loader';

if (window.isStaff === undefined) {
  window.isStaff = false;
}

export const decorators = [
  (Story) => (
    <Provider store={store}>
      <ErrorBoundary>
        <Suspense fallback={<Loader />}>
          <div style={{ padding: '16px' }}>
            <Story />
          </div>
        </Suspense>
      </ErrorBoundary>
    </Provider>
  ),
];
