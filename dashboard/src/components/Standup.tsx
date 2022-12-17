import { Button, Grid, Modal, Typography } from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import '../styles/Standup';
import { Box } from "@mui/system";
import ReactQuill from "react-quill";
import moment from "moment";


interface StandupProp {
    data?: any
}

const YESTERDAY_LABEL = `<i><strong>⌛ Yesterday</strong></i>`;
const TODAY_LABEL = `<p><i><strong>🗓️ Today</strong></i> (${moment().format('YYYY-MM-DD')})</p>`;


export default function Standup(props: StandupProp) {

    const [open, setOpen] = useState<boolean>(false)
    const [standupText, setStandupText] = useState<string>('')
    const [todayStandup, setTodayStandup] = useState<string>(TODAY_LABEL)
    const [yesterdayStandup, setYesterdayStandup] = useState<string>(
        `<p>${YESTERDAY_LABEL} (${moment().subtract(1, 'days').format('YYYY-MM-DD')})</p><br/>`
    )
    const textAreaRef = useRef(null);


    useEffect(() => {
        if (props.data) {
            setYesterdayStandup(
                `<p>${YESTERDAY_LABEL} (${moment().subtract(1, 'days').format('YYYY-MM-DD')})</p><br/>`
            )
            setTodayStandup(TODAY_LABEL + '<br/>')

            const todayDate = moment().format('YYYY-MM-DD')
            let yesterdayDate = moment().subtract(1, 'days').format('YYYY-MM-DD')
            let today: any = {};
            let yesterday: any = {};
            const logs = props.data.logs;
            if (Object.keys(logs).length > 0) {
                if (logs[todayDate]) {
                    for (const todayLog of logs[todayDate]) {
                        if (today[todayLog.project_name]) {
                            today[todayLog.project_name] += todayLog.description
                        } else {
                            today[todayLog.project_name] = todayLog.description
                        }
                    }
                }
                for (const log of Object.keys(logs)) {
                    if (Object.keys(yesterday).length === 0 && moment(todayDate, 'YYYY-MM-DD').isAfter(
                        moment(log, 'YYYY-MM-DD'))) {
                        yesterdayDate = log
                        for (const yesterdayLog of logs[log]) {
                            if (yesterday[yesterdayLog.project_name]) {
                                yesterday[yesterdayLog.project_name] += yesterdayLog.description
                            } else {
                                yesterday[yesterdayLog.project_name] = yesterdayLog.description
                            }
                        }
                    }
                }
            }
            if (Object.keys(today).length > 0) {
                let todayString = '';
                for (const item of Object.keys(today)) {
                    todayString += `<strong>${item}</strong><br/>${today[item]}<br/>`
                }
                setTodayStandup(TODAY_LABEL + '<br/>' + todayString)
            }
            if (Object.keys(yesterday).length > 0) {
                let yesterdayString = '';
                for (const item of Object.keys(yesterday)) {
                    yesterdayString += `<strong>${item}</strong><br/>${yesterday[item]}<br/>`
                }
                setYesterdayStandup(`<p>${YESTERDAY_LABEL} (${yesterdayDate})</p><br/>` + yesterdayString)
            }
        }
    }, [props.data])

    const copyToClip = (str: string) => {
        const clipboardItem = new
            ClipboardItem({
                'text/plain': new Blob([standupText],
                    {type: 'text/plain'}),
                'text/html':  new Blob([standupText],
                    {type: 'text/html'})});

        navigator.clipboard.write([clipboardItem]).then(
            _ => console.log("clipboard.write() Ok"),
            error => console.error(error)
        ) 
    }

    const updateStandupText = () => {
        setStandupText(
            `${yesterdayStandup}` +
            `${todayStandup}` + 
            '<strong>⚠️ Blocker</strong><br/> None'
        )
        setOpen(true)
    }

    const handleModalClose = () => {
        setOpen(false)
    }

    return <div className="Standup">
        <Button 
            onClick={() => updateStandupText()}
            className="StandupButton"
            startIcon={<EmojiPeopleIcon/>} 
            variant="outlined" size="large" color='secondary'>
          Standup
        </Button>
        <Modal open={open} onClose={handleModalClose}>
            <Box className='StandupModal'>
                <Grid container marginBottom={1}>
                    <Grid item xs={6} alignItems={'center'} display={'flex'} flexDirection={'row'}>
                        <EmojiPeopleIcon style={{marginRight: 5}}/> 
                        <Typography variant="h6" component="h2">
                            STANDUP
                        </Typography>
                    </Grid>
                    <Grid item xs={6} textAlign={"right"}>
                        <Button variant="outlined" 
                            onClick={() => {
                                copyToClip(standupText)
                            }}
                            startIcon={<ContentCopyIcon/>}>Copy To Clipboard</Button>
                    </Grid>
                </Grid>
                <ReactQuill
                
                    ref={textAreaRef}
                    theme='snow'
                    value={standupText}
                    onChange={(value: string) => {
                        if (value === '<p><br></p>') {
                            setStandupText('')
                        } else {
                            setStandupText(value)
                        }
                    }}
                    style={{minHeight: '150px'}}
                />
            </Box>
        </Modal>
    </div>
    
}