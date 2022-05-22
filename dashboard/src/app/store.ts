import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import { timesheetApi } from '../services/api'

export const store = configureStore({
    reducer: {
        [timesheetApi.reducerPath]: timesheetApi.reducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(timesheetApi.middleware)
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
    ReturnType,
    RootState,
    unknown,
    Action<string>
    >;
