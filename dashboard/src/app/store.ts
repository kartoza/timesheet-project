import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import { timesheetApi } from '../services/api';
import standupReducer from '../store/standupSlice';

export const store = configureStore({
    reducer: {
        [timesheetApi.reducerPath]: timesheetApi.reducer,
        standup: standupReducer,
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
