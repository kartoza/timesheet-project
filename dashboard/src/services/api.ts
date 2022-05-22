import {createApi, fetchBaseQuery} from "@reduxjs/toolkit/query/react";
import Cookies from 'js-cookie'

const baseQuery = fetchBaseQuery({
    baseUrl: '/'
})

const apiHeaders = {
    "X-CSRFToken": Cookies.get('csrftoken')
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
    tagTypes: ['Timesheet'],
    endpoints: (build) => ({
        addTimesheet: build.mutation({
            query: (body) => ({
                url: '/api/timesheet/',
                method: 'POST',
                headers: apiHeaders,
                body
            }),
            // Pick out data and prevent nested properties in a hook or selector
            transformResponse: (response: { data: any }, meta, arg) => response.data,
            invalidatesTags: ['Timesheet'],
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

export const { useAddTimesheetMutation } = timesheetApi
