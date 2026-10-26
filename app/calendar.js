const google_calendar = require('@googleapis/calendar');

let config = null;
let calendar = null;
let calendar_id = null;
let cache = { key: null, events: [] };  // last good response, served if Google is unreachable
let last_sync = null;

function init(app_config) {
    config = app_config;
}

function get_calendar() {
    if (!calendar) {
        const auth = new google_calendar.auth.GoogleAuth({
            keyFile: config.credentials_path,
            scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        });
        calendar = google_calendar.calendar({ version: 'v3', auth });
    }
    return calendar;
}

async function get_calendar_id() {
    if (config.calendar_id) return config.calendar_id;
    if (!calendar_id) {
        const response = await get_calendar().calendarList.list();
        const items = response.data.items ?? [];
        if (items.length === 0) {
            throw new Error('Service account has no calendars. Share a calendar with it and set "calendar_id" in config.json.');
        }
        calendar_id = items[0].id;
    }
    return calendar_id;
}

// Retrieve events between two dates, falling back to the last good response
async function get_events(start, end) {
    const key = `${start.toISOString()}|${end.toISOString()}`;
    try {
        const id = await get_calendar_id();

        const response = await get_calendar().events.list({
            calendarId: id,
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 2500,
        });

        const events = (response.data.items ?? [])
            .filter(event => event.status !== 'cancelled')
            .map(convert_google_event_to_full_calendar_event);
        cache = { key, events };
        last_sync = new Date();
        return events;
    } catch (err) {
        if (cache.key === key) {
            console.error(`Calendar fetch failed, serving cached events: ${err.message}`);
            return cache.events;
        }
        throw err;
    }
}

function convert_google_event_to_full_calendar_event(event) {
    const full_calendar_event = {
        id: event.id,
        title: event.summary ?? '',
    };

    // The page styles each Google event color (app.css); no color uses the theme's gold
    if (event.colorId) full_calendar_event.classNames = [`event-color-${event.colorId}`];

    if (event.start.dateTime) {
        full_calendar_event.start = event.start.dateTime;
        full_calendar_event.end = event.end.dateTime;
    } else {
        full_calendar_event.start = event.start.date;
        full_calendar_event.end = event.end.date;
        full_calendar_event.allDay = true;
    }
    return full_calendar_event;
}

module.exports = {
    init,
    get_events,
    get_last_sync: () => last_sync,
};
