const { google } = require('googleapis');
const moment = require('moment');
const fs = require('fs');

function get_google_calendar(credentials_file_path) {
    var credentials = JSON.parse(fs.readFileSync(credentials_file_path, 'utf8'));
    // Create a new JWT client using the service account credentials
    const jwtClient = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/calendar'],
        null
    );

    // Create a new calendar API instance
    return google.calendar({ version: 'v3', auth: jwtClient });
}

async function insert_calendar(google_calendar, calendar_id) {
    await google_calendar.calendarList.insert({
        resource: {
            id: calendar_id
        }
    });
}

// Retrieve calendar events from the current week
async function get_events(google_calendar) {
    // Get the current week's start and end dates
    const startDate = moment().startOf('week').toISOString();
    const endDate = moment().endOf('week').toISOString();

    try {
        const calendars = await google_calendar.calendarList.list();
        if (calendars.length < 1) {
            throw new Error("Service Account has no calendars! Must insert calendar...");
        }

        const response = await google_calendar.events.list({
            calendarId: calendars.data.items[0].id, // Use 'primary' for the primary calendar
            timeMin: startDate,
            timeMax: endDate,
            singleEvents: true,
        });

        const events = response.data.items;
        const colors_response = await google_calendar.colors.get();
        const colors = colors_response.data.event;
        return convert_google_event_to_full_calendar_event(events, colors);
    } catch (error) {
        console.error('Error retrieving calendar events:', error.message);
    }
}

function convert_google_event_to_full_calendar_event(google_calendar_events, colors) {
    var fullCalendarEvents = [];
    for (var event of google_calendar_events) {
        var color = 'rgba(0, 0, 0, 0.8)'; // Default
        if (event.colorId) {
            color = colors[Number(event.colorId)].background + 'cc';
        }
        if (event.start.dateTime) {
            fullCalendarEvents.push({
                id: event.id,
                start: event.start.dateTime,
                end: event.end.dateTime,
                title: event.summary,
                color
            }
            )
        } else {
            fullCalendarEvents.push({
                id: event.id,
                start: event.start.date,
                end: event.end.date,
                title: event.summary,
                allDay: true,
                color
            });
        };
    }
    return fullCalendarEvents;
}

module.exports = {
    get_google_calendar,
    insert_calendar,
    get_events,
}