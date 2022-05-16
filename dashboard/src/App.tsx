import React, {useEffect, useState} from 'react';
import './App.scss';
import {
    Container,
    Autocomplete,
    TextField, Stack
} from "@mui/material";


function App() {
    const [activityResults, setActivityResults] = useState([])

    useEffect(() => {
        fetch('/activity-list/').then(
            response => response.json()
        ).then(
            json => setActivityResults(json)
        )
    }, [])

    return (
        <div className="App">
            <Container maxWidth="xl">
                <div className="App-header">
                    <Stack sx={{ width: 800, margin: 'auto'}} style={{ display: 'flex', flexDirection: 'row'}}>
                        <Autocomplete
                            disablePortal
                            id="combo-box-demo"
                            options={activityResults}
                            sx={{width: 250}}
                            renderInput={(params) => <TextField {...params} label="Activity"/>}
                        />
                        <Autocomplete
                            disablePortal
                            id="combo-box-demo"
                            options={[]}
                            sx={{width: 250}}
                            renderInput={(params) => <TextField {...params} label="Project"/>}
                        />
                    </Stack>
                </div>
            </Container>
        </div>
    );
}

export default App;
