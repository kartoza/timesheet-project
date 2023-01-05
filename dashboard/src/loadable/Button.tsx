import React, {Suspense} from 'react';
import Loader from '../loadable/Loader';

const Button = React.lazy(() => import('@mui/material/Button'))


export default function TButton(props: any) {
    return (
        <Suspense fallback={<Loader/>}>
            <Button {...props} />
        </Suspense>
    )
}
