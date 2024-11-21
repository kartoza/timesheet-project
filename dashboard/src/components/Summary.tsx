import {
    Autocomplete,
    Box,
    CircularProgress,
    Grid, LinearProgress,
    Paper, Slider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField
} from "@mui/material";
import {
  createTheme,
  Experimental_CssVarsProvider as CssVarsProvider, ThemeProvider,
  useColorScheme,
} from '@mui/material/styles';
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
import {DownloadIcon} from "../loadable/Icon";
import TButton from "../loadable/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import FaceIcon from '@mui/icons-material/Face';
import {ModeToggle} from "../App";
import {EmployeeContributions, EmployeeContributionsSlider} from "./EmployeeContributions";
import {BurndownChart} from "./BurndownChart";
import {BurndownTable} from "./BurndownTable";
import {UserReportTable} from "./UserReportTable";
import {TaskReportTable} from "./TaskReportTable";
import {theme} from "../utils/Theme";
const CircularMenu = React.lazy(() => import('./Menu'));

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

const DOWNLOAD_API_URL = (
    '/api/download-report-data/?id='
)

const DOWNLOAD_PLANNING_API_URL = (
  '/api/schedule/csv/'
)

const LIST_SUMMARY_API_URL = (
    '/api/list-summary/'
)

const LIST_PUBLIC_TIMELINE_API_URL = (
  '/api/list-public-timeline/'
)

const REPORT_DATA_API_URL = (
    '/api/report-data/?id='
)

const IS_STAFF = (window as any).isStaff
const IS_AUTHENTICATED = (window as any).isLoggedIn

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
    const [publicTimelines, setPublicTimelines] = useState<any[]>([]);
    const [isDownloading, setIsDownloading] = useState<boolean>(false)
    const [reportData, setReportData] = useState<any>(null)

    const downloadCSV = (projectId: string, projectLabel: string) => {
        setIsDownloading(true)
        fetch(DOWNLOAD_API_URL + projectId)
            .then((response) => response.blob())
            .then((blob) => {
                const url = window.URL.createObjectURL(new Blob([blob]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Detailed Report ${projectLabel}.csv`);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
                setIsDownloading(false)
            });
    };

    const downloadPlanningCSV = (projectId: string, projectLabel: string) => {
        setIsDownloading(true)
        fetch(`${DOWNLOAD_PLANNING_API_URL}${projectId}/`)
          .then((response) => response.blob())
          .then((blob) => {
              const url = window.URL.createObjectURL(new Blob([blob]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `Planning ${projectLabel}.csv`);
              document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
              setIsDownloading(false)
          });
    };

    const fetchReportData = (url: string) => {
        setChartLoading(true)
        fetch(url).then(
            response => response.json()
        ).then(
            data => {
                setChartLoading(false)
                setReportData(data)
            }
        )
    }


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
                const lastSprintUnbillable: any = []
                const hoursRemaining: any = []
                const hoursTotal: any = []
                let remaining: any = 0
                if (data) {
                    remaining = data.total_hours.total_hours
                    for (const week of Object.keys(data.hours)) {
                        const hoursData = data.hours[week]
                        labels.push(hoursData.week_string)
                        lastSprintHour.push(hoursData.hours)
                        lastSprintUnbillable.push(hoursData.unbillable_hours)
                        remaining -= hoursData.hours
                        hoursRemaining.push(remaining)
                        hoursTotal.push(data.total_hours.total_hours)
                        rows.push(
                            [
                                hoursData.week_string,
                                data.total_hours.total_hours,
                                parseFloat(remaining.toFixed(2)),
                                parseFloat(hoursData.hours.toFixed(2)),
                                parseFloat(hoursData.unbillable_hours.toFixed(2)),
                            ]
                        )
                    }
                }
                setTableRows(rows)
                setChartData({
                    labels,
                    datasets: [{
                        label: 'Last Sprint Billable',
                        data: lastSprintHour,
                        borderColor: '#FFD321',
                        backgroundColor: '#FFD321',
                    }, {
                      label: 'Last Sprint Unbillable',
                      data: lastSprintUnbillable,
                      borderColor: 'rgba(255,159,33,0.88)',
                      backgroundColor: 'rgba(255,159,33,0.88)',
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
            fetchReportData(REPORT_DATA_API_URL + selectedProject.id)
        } else {
            setChartData(null)
        }
    }, [selectedProject])

    useEffect(() => {
        if (props.selectedProjectId) {
            fetchChartData(PUBLIC_API_URL + props.selectedProjectId)
            fetchReportData(REPORT_DATA_API_URL + props.selectedProjectId)
        } else {
            setPublicMode(false)
            fetch(LIST_SUMMARY_API_URL).then(
                response => response.json()
            ).then(
                data => setSummaries(data)
            )
            fetch(LIST_PUBLIC_TIMELINE_API_URL).then(
              response => response.json()
            ).then(
              data => setPublicTimelines(data)
            )
        }
        if (props.summaryName) {
            setSummaryName(props.summaryName)
        }
    }, [])

    useEffect(() => {
        setProjectLoading(true)
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
        <ThemeProvider theme={theme}>
        <div className="App">
            <CircularMenu/>
            <div className="App-header" style={{ padding: '2vh', fontSize: '15pt' }}>
                <Typography color={"text.primary"} style={{ cursor: "pointer" }} variant="h5" component="div" onClick={() => window.location.href = '/summary'}>
                    Burndown Chart
                </Typography>
                <div style={{ position: 'absolute',
                    right: 0,
                    paddingRight: '1em'
                }}><ModeToggle/></div>
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
                <Grid item xs={1}></Grid>
                <Grid item xs={10}>
                    { chartLoading ? <div className="loading-container">
                        <CircularProgress/></div> : chartData ?
                            <div>
                                { publicMode ?
                                    <Typography variant={'h5'} color={'text.primary'}>{summaryName}</Typography> : null }
                                <BurndownChart chartData={chartData} />
                                <div style={{ padding: 35, marginBottom: 20 }}>
                                    <BurndownTable rows={tableRows} />
                                </div>
                            </div> :
                            <Typography color={"text.primary"}  style={{ fontStyle: 'italic', marginTop: 30, fontSize: 25 }}>
                                Choose a project to obtain the chart</Typography> }

                    { IS_STAFF && reportData && chartData ?
                        <Grid container>
                            <Grid item xs={1}></Grid>
                            <Grid item xs={10}>
                                <EmployeeContributionsSlider
                                    data={reportData['user_based_analysis']['employee_contributions']}
                                />
                                <UserReportTable data={reportData['user_based_analysis']}/>
                                <TaskReportTable data={reportData['task_based_analysis']}/>
                            </Grid>
                        </Grid>
                        : null }

                    { IS_STAFF && (selectedProject || props.selectedProjectId) ?
                    <div style={{ marginBottom: "2em" }}>
                        <TButton
                            onClick={() => downloadCSV(
                                selectedProject ? selectedProject.id : props.selectedProjectId,
                                selectedProject ? selectedProject.label : summaryName)}
                            className="StandupButton"
                            disabled={isDownloading}
                            startIcon={isDownloading ? <CircularProgress size={12}/> : <DownloadIcon/>}
                            variant="outlined" size="large" color='primary'>
                            Download Summary
                        </TButton>
                        <TButton
                          style={{
                              marginLeft: 10
                          }}
                          onClick={() => downloadPlanningCSV(
                            selectedProject ? selectedProject.id : props.selectedProjectId,
                            selectedProject ? selectedProject.label : summaryName)}
                          className="DownloadPlanning"
                          disabled={isDownloading}
                          startIcon={isDownloading ? <CircularProgress size={12}/> : <DownloadIcon/>}
                          variant="outlined" size="large" color='secondary'>
                            Download Planning
                        </TButton>
                    </div> : null }

                    { publicMode ? null :
                        <div style={{ marginTop: 20, marginBottom: 20, textAlign: 'left' }}>
                            <Typography variant={'h5'} style={{ marginBottom: 10 }} color={"text.primary"}>Saved Charts</Typography>
                            {summaries.map(summary =>
                                <Card variant={"outlined"} elevation={2} onClick={() => window.location.href = "/summary/" + summary.slug_name }>
                                    <div className="summary-container" style={{ padding: '20px 20px'}}>
                                        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                                            { summary.project_name }
                                        </Typography>
                                        <Typography style={{ cursor: "pointer" }} variant="h5" component="div">
                                            { summary.name }
                                        </Typography>
                                        <Chip style={{ marginTop: 10}} icon={<FaceIcon />} label={summary.view_count} variant="filled" />
                                    </div>
                                </Card>
                            )}
                          <Typography variant={'h5'} style={{ marginBottom: 10, marginTop: 20 }} color={"text.primary"}>Public Planning</Typography>
                          {publicTimelines.map(timeline =>
                            <Card variant={"outlined"} elevation={2} onClick={() => window.location.href = "/timeline/" + timeline.slug_name }>
                              <div className="summary-container" style={{ padding: '20px 20px'}}>
                                <Typography style={{ cursor: "pointer" }} variant="h5" component="div">
                                  { timeline.name }
                                </Typography>
                              </div>
                            </Card>
                          )}
                        </div>
                    }
                </Grid>
                <Grid item xs={1}></Grid>
            </Grid>
        </div>
        </ThemeProvider>
    )
}
