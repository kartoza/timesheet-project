import React, {useEffect, Suspense, useState} from 'react';
import 'react-quill/dist/quill.snow.css';
import Loader from '../loadable/Loader';
import '../styles/Quill';

const ReactQuill = React.lazy(() => import('react-quill'))


export default function TReactQuill(props: any) {
    return (
        <Suspense fallback={<Loader/>}>
            <ReactQuill
                formats={props.format}
                modules={props.modules}
                theme='snow'
                value={props.value}
                onChange={props.onChange}
                style={props.style}
            />
        </Suspense>
    )
}
