// store/standupSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import moment from "moment";


const YESTERDAY_LABEL = `<i><strong>⌛ Yesterday</strong></i>`;
const TODAY_LABEL = `<p><i><strong>🗓️ Today</strong></i> (${moment().format('YYYY-MM-DD')})</p>`;


export interface StandupState {
    open: boolean;
    standupText: string;
    todayStandup: string;
    yesterdayStandup: string;
    isDrafted?: boolean;
}

const initialState: StandupState = {
    open: false,
    standupText: '',
    todayStandup: TODAY_LABEL,
    yesterdayStandup: `<p>${YESTERDAY_LABEL} (${moment().subtract(1, 'days').format('YYYY-MM-DD')})</p><br/>`,
    isDrafted: false
};


export const standupSlice = createSlice({
    name: 'standup',
    initialState,
    reducers: {
        updateStandupText: (state, action: PayloadAction<string>) => {
            state.standupText = action.payload;
            state.open = true;
        },
        openStandup: (state) => {
            state.open = true;
        },
        closeStandup: (state) => {
            state.open = false;
        },
        initializeStandup: (state, action: PayloadAction<any>) => {
            const logs = action.payload.logs;
            const todayDate = moment().format('YYYY-MM-DD')
            let yesterdayDate = moment().subtract(1, 'days').format('YYYY-MM-DD')
            let today: any = {};
            let yesterday: any = {};
            if (Object.keys(logs).length > 0) {
                if (logs[todayDate]) {
                    for (const todayLog of logs[todayDate]) {
                        if (today[todayLog.project_name]) {
                            if (!today[todayLog.project_name].includes(todayLog.description)) {
                                today[todayLog.project_name] += todayLog.description
                            }
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
                                if (!yesterday[yesterdayLog.project_name].includes(yesterdayLog.description)) {
                                    yesterday[yesterdayLog.project_name] += yesterdayLog.description
                                }
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
                state.todayStandup = TODAY_LABEL + '<br/>' + todayString
            } else {
                state.todayStandup = TODAY_LABEL + '<br/>'
            }
            if (Object.keys(yesterday).length > 0) {
                let yesterdayString = '';
                for (const item of Object.keys(yesterday)) {
                    yesterdayString += `<strong>${item}</strong><br/>${yesterday[item]}<br/>`
                }
                state.yesterdayStandup = `<p>${YESTERDAY_LABEL} (${yesterdayDate})</p><br/>` + yesterdayString
            } else {
                state.yesterdayStandup = `<p>${YESTERDAY_LABEL} (${moment().subtract(1, 'days').format('YYYY-MM-DD')})</p><br/>`
            }
        },
        writeStandupText: (state, action: PayloadAction<string>) => {
            state.standupText = action.payload;
            state.isDrafted = true;
        }
    },
});

export const { updateStandupText, openStandup, closeStandup, initializeStandup, writeStandupText } = standupSlice.actions;

export default standupSlice.reducer;
