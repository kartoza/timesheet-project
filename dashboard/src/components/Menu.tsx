import {
    CircleMenu,
    CircleMenuItem,
    TooltipPlacement,
} from "react-circular-menu";
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import InsightsIcon from '@mui/icons-material/Insights';

const IS_AUTHENTICATED = (window as any).isLoggedIn;
const IS_STAFF = (window as any).isStaff;

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
                <CircleMenuItem
                    onClick={() => window.location.href = '/'}
                    tooltip="Timesheet"
                >
                    <MenuBookIcon />
                </CircleMenuItem>
                <CircleMenuItem tooltip="Planning"
                                onClick={() => window.location.href = '/planning'}
                                tooltipPlacement={TooltipPlacement.Left}>
                    <CalendarMonthIcon />
                </CircleMenuItem>
                <CircleMenuItem tooltip="Burndown Chart"
                                onClick={() => window.location.href = '/summary'}
                                tooltipPlacement={TooltipPlacement.Left}>
                    <ShowChartIcon />
                </CircleMenuItem>
              { IS_STAFF ? <CircleMenuItem tooltip="Insight"
                                onClick={() => window.location.href = '/employee-insight/'}
                                tooltipPlacement={TooltipPlacement.Left}>
                    <InsightsIcon />
                </CircleMenuItem> : null }
            </CircleMenu> : '' }
        </div>
    );
};

export default CircularMenu;
