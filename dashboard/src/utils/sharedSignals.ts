import {signal} from '@preact/signals';
import {TimeLog} from "../services/api";


export const editTimeLogSignal = signal((timeLog: TimeLog) => {});

export const cloneTimeLogSignal = signal((timelog: TimeLog) => {});

export const deleteTimeLogSignal = signal((timelog: TimeLog, checkParent: boolean) => {});

export const resumeTimeLogSignal = signal((timelog: TimeLog) => {});

export const breakTimeLogSignal = signal((timelog: TimeLog) => {});
