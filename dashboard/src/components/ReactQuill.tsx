
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import Looks3Icon from '@mui/icons-material/Looks3';
import Looks5Icon from '@mui/icons-material/Looks5';
import Filter8Icon from '@mui/icons-material/Filter8';

import React, {useEffect, Suspense, useState, useCallback, useRef} from 'react';
import 'react-quill/dist/quill.snow.css';
import Loader from '../loadable/Loader';
import '../styles/Quill';
import ListItemIcon from '@mui/material/ListItemIcon';

const ReactQuill = React.lazy(() => import('react-quill'))
const Popover = React.lazy(() => import('@mui/material/Popover'))



const SIZES = [
    {
        icon: <LooksOneIcon/>,
        detail: "It's quick, I will have it done in less than 1 hour.",
        value: 1
    },
    {
        icon: <LooksTwoIcon/>,
        detail: "Give me 2 hours and I will have it for you.",
        value: 2
    },
    {
        icon: <Looks3Icon/>,
        detail: "It will take me between 2 hours to half a day.",
        value: 3
    },
    {
        icon: <Looks5Icon/>,
        detail: "It will take between half a day and a full day.",
        value: 5
    },
    {
        icon: <Filter8Icon/>,
        detail: "This is a full day job.",
        value: 8
    }
]

const KEY_WORD_REGEX = '\\['
const KEY_WORD = '['


export default function TReactQuill(props: any) {
    const [open, setOpen] = useState<boolean>(false)
    const [anchorPosition, setAnchorPosition] = useState<any>({
        top: 0,
        left: 0
    })
    const quill = useRef(null)
    const quillContainer = useRef(null)
    const [itemSelected, setItemSelected] = useState<number>(0)

    const onChange = useCallback((value: any) => {  
        // Find the last colon
        if (!quill.current || !quillContainer.current) {
            return false
        }
        const editor: any = (quill.current as any).getEditor()
        const container: any = (quillContainer.current as any)
        const containerBound = container.getBoundingClientRect()
        const sel: any = editor.getSelection()
        const bound: any = editor.getBounds(sel.index)

        setAnchorPosition({
            top: containerBound.top + bound.top,
            left: containerBound.left + bound.left
        })
        let re = new RegExp(`(${KEY_WORD_REGEX}<\/()>?(\\w+[<\/(\\w+)>]+))$`, "g");
        if (value.match(re)) {
            setItemSelected(1)
            setOpen(true)
        }
        props.onChange(value)
    }, [quill, quillContainer])

    const addSize = (index = null) => {
        try {
            const editor: any = (quill.current as any).getEditor()
            const size = SIZES[index ? index : itemSelected - 1]
            const currentValue = props.value;
            props.onChange(currentValue.replace(`${KEY_WORD}</`, `[${size.value}]&nbsp;</`))
            setTimeout(() => {
                editor.setSelection(editor.getSelection().index + 12, 0)
            }, 100)
        } catch (e) {
            console.log(e)
            return
        }
    }

    const handleKeyDown = (e: any) => {
         // arrow up/down button should select next/previous list element
        if (open) {
            if (e.keyCode === 38 && itemSelected > 1) {
                e.preventDefault();
                setItemSelected(itemSelected - 1)
            } else if (e.keyCode === 40 && itemSelected < SIZES.length) {
                e.preventDefault();
                setItemSelected(itemSelected + 1)
            } else if (e.keyCode === 13) {
                e.preventDefault();
                e.stopPropagation();
                addSize()
                setOpen(false)
            } else {
                setOpen(false)
            }
        }
    }

    const handleListItemClick = (index: any) => {
        setItemSelected(index + 1)
        addSize(index)
    }

    const handlePopoverClick = (e: any) => {
        setOpen(false)
        const editor: any = (quill.current as any).getEditor()
        editor.focus()
        setTimeout(() => {
            editor.setSelection(editor.getSelection().index + 12, 0)
        }, 100)
    } 

    return (
        <Suspense fallback={<Loader/>}>
            <Popover
                id="size-popover"
                open={open}
                anchorReference="anchorPosition"
                anchorPosition={anchorPosition}
                disableEnforceFocus
                hideBackdrop
                onClick={handlePopoverClick}
                onKeyDown={handleKeyDown}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                disableAutoFocus
            > 
                <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
                    <List component="nav" dense>
                        { SIZES.map((size, index) => (
                            <ListItemButton onClick={(e) => handleListItemClick(index)} 
                                disableRipple dense selected={itemSelected == index + 1} key={index}>
                                <ListItemIcon>
                                    {size.icon}
                                </ListItemIcon>
                                <ListItemText primary={size.detail} />
                            </ListItemButton>
                        ))}
                    </List>
                </Box>
            </Popover>
            <div ref={quillContainer}>
                <ReactQuill
                    ref={quill}
                    readOnly={open}
                    formats={props.format}
                    modules={props.modules}
                    theme='snow'
                    value={props.value}
                    onChange={onChange}
                    style={props.style}
                    onKeyDown={handleKeyDown}
                />
            </div>
        </Suspense>
    )
}
