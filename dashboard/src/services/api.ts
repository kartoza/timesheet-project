import {createApi, fetchBaseQuery} from "@reduxjs/toolkit/query/react";
import Cookies from 'js-cookie'

const baseQuery = fetchBaseQuery({
    baseUrl: '/'
})

const apiHeaders = {
    "X-CSRFToken": Cookies.get('csrftoken')
}

export interface TimeLog {
    id: string
    description: string
    task: string
    task_id: string
    task_name: string
    activity_type: string
    hours: string
    project_name: string
    project_id: string
    from_time: string
    to_time: string
    deleteTimeLog: any
    running: boolean
    activity_id: string
}


type TimeLogResponse = TimeLog[]

type TimeLogResult = {
    logs: TimeLog[] | [],
    running: TimeLog | null
}

const baseQueryWithInterceptor = async (args: any, api: any, extraOptions: any) => {
    let results = await baseQuery(args, api, extraOptions)
    if (results.error && results.error.status == 401) {
        console.log(results)
    }
    return results
}

export const timesheetApi = createApi({
    baseQuery: baseQueryWithInterceptor,
    tagTypes: ['TimeLog'],
    endpoints: (build) => ({
        getTimeLogs: build.query<TimeLogResult, void>({
            query: () => 'api/timelog/',
            transformResponse: (response: TimeLogResponse) => {
                let timeLogs: TimeLogResult = {
                    running: null,
                    logs: []
                }
                let groupByDate: any = {}
                for (let data of response) {
                    if (data.running) {
                        timeLogs.running = data;
                        continue;
                    }
                    let dateString = data.from_time.split(' ')[0];
                    if (groupByDate.hasOwnProperty(dateString)) {
                        groupByDate[dateString].push(data)
                    } else {
                        groupByDate[dateString] = [
                            data
                        ]
                    }
                }
                timeLogs.logs = groupByDate;
                return timeLogs;
            },
            providesTags: ['TimeLog'],
        }),
        deleteTimeLog: build.mutation({
            query: (body) => ({
                url: '/api/delete-time-log/',
                method: 'POST',
                headers: apiHeaders,
                body
            }),
            invalidatesTags: ['TimeLog']
        }),
        submitTimesheet: build.mutation({
            query: () => ({
                url: '/api/submit-timesheet/',
                method: 'POST',
                headers: apiHeaders,
            }),
            invalidatesTags: ['TimeLog']
        }),
        updateTimesheet: build.mutation({
            query: (body) => ({
                url: `/api/timesheet/${body['id']}/`,
                method: 'PATCH',
                headers: apiHeaders,
                body
            }),
            invalidatesTags: ['TimeLog'],
            transformResponse(response: TimeLog) {
                return response;
            },
        }),
        addTimesheet: build.mutation({
            query: (body) => ({
                url: '/api/timesheet/',
                method: 'POST',
                headers: apiHeaders,
                body
            }),
            invalidatesTags: ['TimeLog'],
            transformResponse(response: TimeLog) {
                return response;
            },
            // onQueryStarted is useful for optimistic updates
            // The 2nd parameter is the destructured `MutationLifecycleApi`
            async onQueryStarted(
                arg,
                { dispatch, getState, queryFulfilled, requestId, extra, getCacheEntry }
            ) {},
            // The 2nd parameter is the destructured `MutationCacheLifecycleApi`
            async onCacheEntryAdded(
                arg,
                {
                    dispatch,
                    getState,
                    extra,
                    requestId,
                    cacheEntryRemoved,
                    cacheDataLoaded,
                    getCacheEntry,
                }
            ) {},
        })
    })
})

// @ts-ignore
export const { useAddTimesheetMutation, useUpdateTimesheetMutation ,useGetTimeLogsQuery, useDeleteTimeLogMutation, useSubmitTimesheetMutation } = timesheetApi
