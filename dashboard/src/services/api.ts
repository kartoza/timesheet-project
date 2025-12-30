import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Cookies from "js-cookie";

const baseQuery = fetchBaseQuery({
  baseUrl: "/",
});

const apiHeaders = {
  "X-CSRFToken": Cookies.get("csrftoken") || "",
};

export interface TimeLog {
  parent?: string;
  project_active: any;
  id: string;
  description: string;
  task: string;
  task_id: string;
  task_name: string;
  activity_type: string;
  hours: string;
  project_name: string;
  project_id: string;
  from_time: string;
  to_time: string;
  deleteTimeLog: any;
  running: boolean;
  submitted: boolean;
  activity_id: string;
  edit_button_clicked?: any;
  copy_button_clicked?: any;
  resume_button_clicked?: any;
  delete_button_clicked?: any;
  total_children: number;
  all_from_time: string;
  all_to_time: string;
  all_hours: string;
}

type TimeLogResponse = TimeLog[];

type TimeLogResult = {
  logs: TimeLog[] | [];
  running: TimeLog | null;
};

const baseQueryWithInterceptor = async (
  args: any,
  api: any,
  extraOptions: any
) => {
  let results = await baseQuery(args, api, extraOptions);
  if (results.error && results.error.status === 401) {
    console.log(results);
  }
  return results;
};

export const timesheetApi = createApi({
  baseQuery: baseQueryWithInterceptor,
  tagTypes: ["TimeLog"],
  endpoints: (build) => ({
    getTimeLogs: build.query<TimeLogResult, void>({
      query: () => "api/timelog/",
      transformResponse: (response: TimeLogResponse) => {
        let timeLogs: TimeLogResult = {
          running: null,
          logs: [],
        };
        let groupByDate: any = {};
        for (let data of response) {
          if (data.running) {
            timeLogs.running = data;
            continue;
          }
          let dateString = data.from_time.split(" ")[0];
          if (groupByDate.hasOwnProperty(dateString)) {
            groupByDate[dateString].push(data);
          } else {
            groupByDate[dateString] = [data];
          }
        }
        timeLogs.logs = groupByDate;
        return timeLogs;
      },
      providesTags: ["TimeLog"],
    }),
    deleteTimeLog: build.mutation({
      query: (body) => ({
        url: "/api/delete-time-log/",
        method: "POST",
        headers: apiHeaders,
        body,
      }),
      invalidatesTags: ["TimeLog"],
    }),
    submitTimesheet: build.mutation({
      query: () => ({
        url: "/api/submit-timesheet/",
        method: "POST",
        headers: apiHeaders,
      }),
      invalidatesTags: ["TimeLog"],
    }),
    clearSubmittedTimesheets: build.mutation({
      query: () => ({
        url: "/api/clear-submitted-timesheets/",
        method: "POST",
        headers: apiHeaders,
      }),
      invalidatesTags: ["TimeLog"],
    }),
    updateTimesheet: build.mutation({
      query: (body) => ({
        url: `/api/timesheet/${body["id"]}/`,
        method: "PUT",
        headers: apiHeaders,
        body,
      }),
      invalidatesTags: ["TimeLog"],
      transformResponse(response: TimeLog) {
        return response;
      },
    }),
    addTimesheet: build.mutation({
      query: (body) => ({
        url: "/api/timesheet/",
        method: "POST",
        headers: apiHeaders,
        body,
      }),
      invalidatesTags: ["TimeLog"],
      transformResponse(response: TimeLog) {
        return response;
      },
    }),
    breakTimesheet: build.mutation({
      query: (timelogId: string) => ({
        url: `/api/break-timesheet/${timelogId}/`,
        method: "POST",
        headers: apiHeaders,
      }),
      invalidatesTags: ["TimeLog"],
    }),
  }),
});

export const {
  useAddTimesheetMutation,
  useUpdateTimesheetMutation,
  useGetTimeLogsQuery,
  useDeleteTimeLogMutation,
  useSubmitTimesheetMutation,
  useClearSubmittedTimesheetsMutation,
  useBreakTimesheetMutation,
} = timesheetApi;
