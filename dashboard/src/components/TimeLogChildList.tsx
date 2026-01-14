import React, {useEffect, useState} from "react";
import {Button, List, ListItem, Modal, Typography} from "@mui/material";
import {Box} from "@mui/system";
import {TimeLog} from "../services/api";

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

function TimeLogChildList(props: any) {
    const [open, setOpen] = useState(false)

    const handleClose = () => {
        props.onClose()
        setOpen(false)
    }

    useEffect(() => {
        if (props.timeLogChildren && props.timeLogChildren.length > 0) {
            setOpen(true)
        } else {
            setOpen(false)
        }
    }, [props.timeLogChildren]);

    const getListItemStyle = (index) => {
        return { borderRadius: '4px', cursor: 'pointer', border: '1px solid #ccc', margin: '5px' };
    };

    const timelogSelected = (timelog: TimeLog) => {
        props.timeLogSelected(timelog)
        setOpen(false)
    }

    const handleDeleteAll = () => {
        if (props.onDeleteAll) {
            props.onDeleteAll(props.timeLogChildren)
            setOpen(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={style} className={'modal'}>
                <Typography id="modal-modal-title" variant="h6" component="h2">
                    Choose timelog to {props.editMode ? 'edit' : 'delete'}
                </Typography>
                <List>
                    { props.timeLogChildren ? props.timeLogChildren.map(
                        (data: TimeLog, index) => (
                            <ListItem key={index} divider onClick={() => timelogSelected(data)} style={getListItemStyle(index)}>
                                {data.from_time.split(' ').slice(-1)} - {data.to_time.split(' ').slice(-1)} ({data.hours})
                            </ListItem>
                        )) : null
                    }
                </List>
                {!props.editMode && props.timeLogChildren && props.timeLogChildren.length > 0 && (
                    <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        onClick={handleDeleteAll}
                        sx={{ mt: 2 }}
                    >
                        Delete All
                    </Button>
                )}
            </Box>
        </Modal>
    )
}

export default TimeLogChildList
