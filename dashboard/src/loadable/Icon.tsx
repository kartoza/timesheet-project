import React, {Suspense} from 'react';

const MuiSettingsIcon = React.lazy(() => import('@mui/icons-material/Settings'))
const MuiSendIcon = React.lazy(() => import('@mui/icons-material/Send'))
const MuiLightModeIcon = React.lazy(() => import('@mui/icons-material/LightMode'))
const MuiDarkModeIcon = React.lazy(() => import('@mui/icons-material/DarkMode'))
const MuiEmojiPeopleIcon = React.lazy(() => import('@mui/icons-material/EmojiPeople'))
const MuiContentCopyIcon = React.lazy(() => import('@mui/icons-material/ContentCopy'))
const MuiListIcon = React.lazy(() => import('@mui/icons-material/List'))
const MuiPlayCircleIcon = React.lazy(() => import('@mui/icons-material/PlayCircle'))
const MuiClearAllIcon = React.lazy(() => import('@mui/icons-material/ClearAll'))

const MuiDeleteSweepIcon = React.lazy(() => import('@mui/icons-material/DeleteSweep'))
const MuiMoreVertIcon = React.lazy(() => import('@mui/icons-material/MoreVert'))
const MuiEditIcon = React.lazy(() => import('@mui/icons-material/Edit'))
const MuiTaskAltIcon = React.lazy(() => import('@mui/icons-material/TaskAlt'))
const MuiAssignmentIcon = React.lazy(() => import('@mui/icons-material/Assignment'))
const MuiEngineeringIcon = React.lazy(() => import('@mui/icons-material/Engineering'))
const MuiMapIcon = React.lazy(() => import('@mui/icons-material/Map'))
const MuiDownloadIcon = React.lazy(() => import('@mui/icons-material/Download'))


function IconLoader(props: any) {
    return <div style={{ width: 20, height: 20, ...props.style }}></div>
}

export function SettingsIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiSettingsIcon {...props} />
        </Suspense>
    )
}

export function SendIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiSendIcon {...props} />
        </Suspense>
    )
}

export function LightModeIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiLightModeIcon {...props} />
        </Suspense>
    )
}

export function DarkModeIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiDarkModeIcon {...props} />
        </Suspense>
    )
}

export function EmojiPeopleIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiEmojiPeopleIcon {...props} />
        </Suspense>
    )
}

export function ContentCopyIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiContentCopyIcon {...props} />
        </Suspense>
    )
}

export function ListIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiListIcon {...props} />
        </Suspense>
    )
}

export function PlayCircleIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiPlayCircleIcon {...props} />
        </Suspense>
    )
}

export function ClearAllIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiClearAllIcon {...props} />
        </Suspense>
    )
}

export function DeleteSweepIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiDeleteSweepIcon {...props} />
        </Suspense>
    )
}

export function MoreVertIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiMoreVertIcon {...props} />
        </Suspense>
    )
}

export function EditIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiEditIcon {...props} />
        </Suspense>
    )
}

export function TaskAltIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiTaskAltIcon {...props} />
        </Suspense>
    )
}

export function AssignmentIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiAssignmentIcon {...props} />
        </Suspense>
    )
}

export function EngineeringIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiEngineeringIcon {...props} />
        </Suspense>
    )
}

export function MapIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiMapIcon {...props} />
        </Suspense>
    )
}

export function DownloadIcon(props: any) {
    return (
        <Suspense fallback={<IconLoader {...props}/>}>
            <MuiDownloadIcon {...props} />
        </Suspense>
    )
}


