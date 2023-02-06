import { Autocomplete, CircularProgress, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js';
import React from "react";
import { useEffect, useState } from "react";
import { Line } from 'react-chartjs-2';
  
import '../styles/App.scss';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

  
export const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Burndown Chart',
      },
    },
};


const API_URL = (
    '/api/burndown-chart-data/?project='
)

const PUBLIC_API_URL = (
    '/api/public-burndown-chart-data/?id='
)

const LIST_SUMMARY_API_URL = (
    '/api/list-summary/'
)

function BurnChartTable(props: any) {
    return (
      props.rows ? 
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell>Week</TableCell>
              <TableCell>Hours Total</TableCell>
              <TableCell>Hours Remaining</TableCell>
              <TableCell>Last Sprint Hours</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {props.rows.map((row) => (
              <TableRow
                key={row[0]}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">{row[0]}</TableCell>
                <TableCell>{row[1]}</TableCell>
                <TableCell>{row[2]}</TableCell>
                <TableCell>{row[3]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      : null
    );
  }

export default function Summary(props: any) {
    const [chartData, setChartData] = useState<any>(null)
    const [selectedProject, setSelectedProject] = useState<any>(null)
    const [projectLoading, setProjectLoading] = useState<boolean>(false)
    const [chartLoading, setChartLoading] = useState<boolean>(false)
    const [projectInput, setProjectInput] = useState('')
    const [projects, setProjects] = useState<any>([])
    const [tableRows, setTableRows] = useState<any>([])
    const [publicMode, setPublicMode] = useState<boolean>(true)
    const [summaryName, setSummaryName] = useState<string>('')
    const [summaries, setSummaries] = useState<any[]>([])

    const fetchChartData = (url: string) => {
        setChartLoading(true)
        setChartData(null)
        setSummaryName('')
        fetch(url).then(
            response => response.json()
        ).then(
            data => {
                const rows:any = []
                const labels:any = []
                const lastSprintHour: any = []
                const hoursRemaining: any = []
                const hoursTotal: any = []
                let remaining: any = 0
                if (data) {
                    remaining = data.total_hours.total_hours
                    for (const week of Object.keys(data.hours)) {
                        const hoursData = data.hours[week]
                        labels.push(hoursData.week_string)
                        lastSprintHour.push(hoursData.hours)
                        remaining -= hoursData.hours
                        hoursRemaining.push(remaining)
                        hoursTotal.push(data.total_hours.total_hours)
                        rows.push(
                            [
                                hoursData.week_string,
                                data.total_hours.total_hours,
                                parseFloat(remaining.toFixed(2)),
                                parseFloat(hoursData.hours.toFixed(2))
                            ]
                        )
                    }
                }
                setTableRows(rows)
                setChartData({
                    labels,
                    datasets: [{
                        label: 'Last Sprint Hours',
                        data: lastSprintHour,
                        borderColor: '#FFD321',
                        backgroundColor: '#FFD321',
                    }, {
                        label: 'Hours Remaining',
                        data: hoursRemaining,
                        borderColor: '#FF430F',
                        backgroundColor: '#FF430F',
                    }, {
                        label: 'Hours Total',
                        data: hoursTotal,
                        borderColor: '#004687',
                        backgroundColor: '#004687'
                    }
                    ]
                })
                setChartLoading(false)
            }
        )
    }

    useEffect(() => {
        if (selectedProject) {
            fetchChartData(API_URL + selectedProject.label)
        } else {
            setChartData(null)
        }
    }, [selectedProject])

    useEffect(() => {
        if (props.selectedProjectId) {
            fetchChartData(PUBLIC_API_URL + props.selectedProjectId)
        } else {
            setPublicMode(false)
            fetch(LIST_SUMMARY_API_URL).then(
                response => response.json()
            ).then(
                data => setSummaries(data)
            )
        }
        if (props.summaryName) {
            setSummaryName(props.summaryName)
        }
    }, [])

    useEffect(() => {
        setProjectLoading(true)
        console.log(projectInput)
        if (projectInput.length > 0) {
            fetch('/project-list/?ignoreUser=True&q=' + projectInput).then(
                response => response.json()
            ).then(
                json => {
                    setProjects(json)
                    setProjectLoading(false)
                }
            )
        } else {
            setProjects([])
            setProjectLoading(false)
        }
    }, [projectInput])

    return (
        <div className="App">
            <div className="App-header" style={{ height: '12vh', fontSize: '15pt' }}>
                Burndown Chart
            </div>
            <Grid container>
                <Grid item xs={2}></Grid>
                <Grid item xs={8}>
                    { publicMode ? null :
                    <Autocomplete
                        disablePortal
                        id="combo-box-demo"
                        // @ts-ignore
                        options={projects}
                        getOptionLabel={ (options: any) => (options['label'])}
                        isOptionEqualToValue={(option: any, value: any) => option['id'] == value['id']}
                        onChange={(event: any, value: any) => {
                            if (value) {
                                setSelectedProject(value)
                            } else {
                                setSelectedProject(null)
                            }
                        }}
                        value={selectedProject}
                        onInputChange={(event, newInputValue) => {
                            setProjectInput(newInputValue)
                        }}
                        loading={projectLoading}
                        renderInput={(params) => (
                            <TextField {...params}
                                        label="Project"
                                        variant="filled"
                                        className="headerInput"
                                        InputProps={{
                                            ...params.InputProps,
                                            disableUnderline: true,
                                            endAdornment: (
                                                <React.Fragment>
                                                    { projectLoading ?
                                                        <CircularProgress color="inherit" size={20} /> : null }
                                                    { params.InputProps.endAdornment }
                                                </React.Fragment>
                                            )
                                        }}
                            />
                        )
                        }
                    />
                    }
                </Grid>
            </Grid>
            <Grid container>
                <Grid item xs={2}></Grid>
                <Grid item xs={8}>
                    { chartLoading ? <div className="loading-container">
                        <CircularProgress/></div> : chartData ? 
                            <div>
                                { publicMode ?
                                    <h1>{summaryName}</h1> : null }
                                <Line options={options} data={chartData} />
                                <div style={{ padding: 35, marginBottom: 20 }}>
                                    <BurnChartTable rows={tableRows} />
                                </div>
                            </div> : 
                            <div style={{ fontStyle: 'italic', marginTop: 30, fontSize: 25 }}>
                                Choose a project to get the chart</div> }
                    { publicMode ? null : 
                        <div style={{ marginTop: 20, marginBottom: 20, textAlign: 'left' }}>
                            <h3>Saved Charts</h3>
                            {summaries.map(summary => 
                                <div className="summary-container" style={{ border: '1px solid #000', borderRadius: 8, padding: '10px 20px'}}>
                                    <p><a href={'/summary/' + summary.slug_name}>{ summary.name }</a></p>
                                    <p>Project: {summary.project_name}</p>
                                    <p>View: {summary.view_count}</p>
                                </div>
                            )}
                        </div>
                    }
                </Grid>
                <Grid item xs={2}></Grid>
            </Grid>
        </div>
    )
}
