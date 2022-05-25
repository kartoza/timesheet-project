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
    activity_type: string
    hours: string
    project_name: string
    from_time: string
    to_time: string
}

type TimeLogResponse = TimeLog[]

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
        getTimeLogs: build.query<TimeLogResponse, void>({
            query: () => 'api/timelog/',
            transformResponse: (response: TimeLogResponse) => {
                let groupByDate: any = {}
                for (let data of response) {
                    let date = new Date(data.from_time).toDateString();
                    if (groupByDate.hasOwnProperty(date)) {
                        groupByDate[date].push(data)
                    } else {
                        groupByDate[date] = [
                            data
                        ]
                    }
                }
                return groupByDate
            },
            providesTags: (result) => {
                if (result) {
                    return [
                        ...Object.keys(result).map(( id ) => ({ type: 'TimeLog' as const, id })),
                        { type: 'TimeLog', id: 'LIST' },
                    ]
                }
                return [{ type: 'TimeLog', id: 'LIST' }]
            }
        }),
        addTimesheet: build.mutation({
            query: (body) => ({
                url: '/api/timesheet/',
                method: 'POST',
                headers: apiHeaders,
                body
            }),
            // Pick out data and prevent nested properties in a hook or selector
            transformResponse: (response: { data: any }, meta, arg) => response.data,
            invalidatesTags: ['TimeLog'],
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

export const { useAddTimesheetMutation, useGetTimeLogsQuery } = timesheetApi
