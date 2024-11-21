import React, { Suspense, forwardRef } from 'react';
import Loader from '../loadable/Loader';
import { ButtonProps } from '@mui/material/Button'; // Import ButtonProps
const Button = React.lazy(() => import('@mui/material/Button'));

const TButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return (
    <Suspense fallback={<Loader />}>
      <Button ref={ref} {...props} />
    </Suspense>
  );
});

export default TButton;
