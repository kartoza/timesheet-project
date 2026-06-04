import {
    CircleMenu,
    CircleMenuItem,
    TooltipPlacement,
} from "react-circular-menu";
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import InsightsIcon from '@mui/icons-material/Insights';
import DashboardIcon from '@mui/icons-material/Dashboard';

const IS_AUTHENTICATED = (window as any).isLoggedIn;
const CAN_ACCESS_PMO = (window as any).canAccessPMO;

export const CircularMenu = (props) => {
    return (
        <div style={{
            position: 'fixed',
            zIndex: 999,
            bottom: 0,
            right: 0,
            padding: '2em'
        }}>
            { IS_AUTHENTICATED ?
            <CircleMenu
                startAngle={260}
                rotationAngle={-120}
                itemSize={2}
                radius={5}
                /**
                 * rotationAngleInclusive (default true)
                 * Whether to include the ending angle in rotation because an
                 * item at 360deg is the same as an item at 0deg if inclusive.
                 * Leave this prop for angles other than 360deg unless otherwise desired.
                 */
                rotationAngleInclusive={false}
            >
                {[
                    <CircleMenuItem key="timesheet"
                        onClick={() => window.location.href = '/'}
                        tooltip="Timesheet"
                    >
                        <MenuBookIcon />
                    </CircleMenuItem>,
                    <CircleMenuItem key="planning" tooltip="Planning"
                                    onClick={() => window.location.href = '/planning'}
                                    tooltipPlacement={TooltipPlacement.Left}>
                        <CalendarMonthIcon />
                    </CircleMenuItem>,
                    <CircleMenuItem key="burndown" tooltip="Burndown Chart"
                                    onClick={() => window.location.href = '/summary'}
                                    tooltipPlacement={TooltipPlacement.Left}>
                        <ShowChartIcon />
                    </CircleMenuItem>,
                    <CircleMenuItem key="insight" tooltip="Insight"
                                    onClick={() => window.location.href = '/employee-insight/'}
                                    tooltipPlacement={TooltipPlacement.Left}>
                        <InsightsIcon />
                    </CircleMenuItem>,
                    CAN_ACCESS_PMO && (
                        <CircleMenuItem key="pmo" tooltip="PMO Dashboard"
                                        onClick={() => window.location.href = '/pmo-dashboard/'}
                                        tooltipPlacement={TooltipPlacement.Left}>
                            <DashboardIcon />
                        </CircleMenuItem>
                    ),
                ].filter(Boolean)}
            </CircleMenu> : '' }
        </div>
    );
};

export default CircularMenu;
