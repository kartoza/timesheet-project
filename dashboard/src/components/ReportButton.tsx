import React from 'react';
import TButton from "../loadable/Button";
import {styled} from "@mui/material";
import BugReportIcon from '@mui/icons-material/BugReport';

const CustomButton = styled(TButton)({
  display: 'inline-block',
  padding: 0,
  minHeight: 0,
  minWidth: 0,
  height: 40,
  width: 40,
  paddingTop: 5,
  borderRadius: 90
});

export default function ReportButton(props: any) {
  return (
    <CustomButton color="warning" variant="contained"
             sx={{position: 'fixed', zIndex: 99, left: 0, bottom: 0, margin: 3}}
             onClick={() => {
               window.open(
                 'https://github.com/kartoza/timesheet-project/issues/new',
                 '_blank'
               );
             }}
             disabled={false}
             disableElevation>
      <BugReportIcon fontSize={"small"}/>
    </CustomButton>
  )
}
