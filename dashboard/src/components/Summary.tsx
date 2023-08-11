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
    Experimental_CssVarsProvider as CssVarsProvider,
    experimental_extendTheme as extendTheme,
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

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);


// @ts-ignore
const modeTheme = extendTheme({});

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

const LIST_SUMMARY_API_URL = (
    '/api/list-summary/'
)

const REPORT_DATA_API_URL = (
    '/api/report-data/?id='
)

const IS_STAFF = (window as any).isStaff

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
        <CssVarsProvider theme={modeTheme}>
        <div className="App">
            <div className="App-header" style={{ padding: '2vh', fontSize: '15pt' }}>
                <Typography style={{ cursor: "pointer" }} variant="h5" component="div" onClick={() => window.location.href = '/summary'}>
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
                                    <h1>{summaryName}</h1> : null }
                                <BurndownChart chartData={chartData} />
                                <div style={{ padding: 35, marginBottom: 20 }}>
                                    <BurndownTable rows={tableRows} />
                                </div>
                            </div> : 
                            <div style={{ fontStyle: 'italic', marginTop: 30, fontSize: 25 }}>
                                Choose a project to get the chart</div> }

                    { IS_STAFF && reportData && chartData ?
                        <Grid container>
                            <Grid item xs={1}></Grid>
                            <Grid item xs={10}>
                                <EmployeeContributionsSlider data={reportData['user_based_analysis']['employee_contributions']}/>
                                <UserReportTable data={reportData['user_based_analysis']}/>
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
                            Download
                        </TButton>
                    </div> : null }

                    { publicMode ? null : 
                        <div style={{ marginTop: 20, marginBottom: 20, textAlign: 'left' }}>
                            <h3>Saved Charts</h3>
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
                        </div>
                    }
                </Grid>
                <Grid item xs={1}></Grid>
            </Grid>
        </div>
        </CssVarsProvider>
    )
}
