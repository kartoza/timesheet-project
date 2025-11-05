import { Grid, Modal, Typography } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../app/store";
import TReactQuill from "./ReactQuill";
import TButton from "../loadable/Button";
import '../styles/Standup';
import { Box } from "@mui/system";
import moment from "moment";
import { EmojiPeopleIcon, ContentCopyIcon } from "../loadable/Icon";
import { updateStandupText, openStandup, closeStandup, initializeStandup, writeStandupText } from "../store/standupSlice";


interface StandupProp {
    data?: any
}


export default function Standup(props: StandupProp) {

    const dispatch = useDispatch<AppDispatch>();
    const { open, standupText, todayStandup, yesterdayStandup, isDrafted } = useSelector((state: RootState) => state.standup);
    const textAreaRef = useRef(null);


    useEffect(() => {
        if (props.data) {
            dispatch(initializeStandup(props.data))
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

    const updateStandupTextData = () => {
        if (isDrafted) {
            dispatch(openStandup())
            return;
        }

        dispatch(updateStandupText(
            `${yesterdayStandup}` +
            `${todayStandup}` + 
            '<strong>⚠️ Blocker</strong><br/> None'
        ))
    }

    const handleModalClose = () => {
        dispatch(closeStandup())
    }

    return <div className="Standup">
        <TButton 
            onClick={() => updateStandupTextData()}
            className="StandupButton"
            startIcon={<EmojiPeopleIcon/>} 
            variant="outlined" size="large" color='secondary'>
          Standup
        </TButton>
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
                        <TButton variant="outlined"
                             color={'primary'}
                            onClick={() => {
                                copyToClip(standupText)
                            }}
                            startIcon={<ContentCopyIcon/>}>Copy To Clipboard</TButton>
                    </Grid>
                </Grid>
                <TReactQuill
                    formats={['bold', 'link', 'strike', 
                        'italic', 'list', 'indent', 'align', 'code-block']}
                    modules={{
                        toolbar: [
                          ['bold', 'italic','strike', 'blockquote'],
                          [{'list': 'ordered'}, {'list': 'bullet'}],
                          ['link'],
                        ],
                      }}
                    ref={textAreaRef}
                    value={standupText}
                    onChange={(value: string) => {
                        if (value === '<p><br></p>') {
                            dispatch(writeStandupText(''))
                        } else {
                            dispatch(writeStandupText(value))
                        }
                    }}
                    style={{minHeight: '150px'}}
                />
            </Box>
        </Modal>
    </div>
    
}