
export function addHours(numOfHours: any, date = new Date()) {
    let numOfSeconds = numOfHours / 3600
    date.setTime(date.getTime() + numOfSeconds * 60 * 60 * 60 * 60 * 1000);
    return date;
}

export function formatTime(date = new Date()) {
    let tzOffset = (new Date()).getTimezoneOffset() * 60000;
    let localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, -1);
    return localISOTime.replace('T', ' ').split('.')[0]
}

export function isTodayInDates(dateString: string) {
    if (!dateString) {
        return false
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = dateString.split(',').map(date => {
        const d = new Date(date.trim());
        d.setHours(0, 0, 0, 0);
        return d;
    });

    return dates.some(d => d.getTime() === today.getTime());
}
