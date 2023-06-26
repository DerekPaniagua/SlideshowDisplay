const { google } = require('googleapis');
const moment = require('moment');
const fs = require('fs');

// Retrieve calendar events from the current week
async function getEventsFromCurrentWeek(key_file_path) {
    var myjson = JSON.parse(fs.readFileSync(key_file_path, 'utf8'));

    // Create a new JWT client using the service account credentials
    const jwtClient = new google.auth.JWT(
    myjson.client_email,
    null,
    myjson.private_key,
    ['https://www.googleapis.com/auth/calendar'],
    null
    );

    // Create a new calendar API instance
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });
    // Get the current week's start and end dates
    const startDate = moment().startOf('week').toISOString();
    const endDate = moment().endOf('week').toISOString();

    try {
        const calendars = await calendar.calendarList.list();
        if (calendar.length < 1) {
            throw new Error("Service Account has no calendars! Must insert calendar...");
        }

        const response = await calendar.events.list({
            calendarId: calendars.data.items[0].id, // Use 'primary' for the primary calendar
            timeMin: startDate,
            timeMax: endDate,
        });

        const events = response.data.items;
        return convertToFullCalendarEvent(events);
    } catch (error) {
        console.error('Error retrieving calendar events:', error.message);
    }
}

function convertToFullCalendarEvent(google_calendar_events){
    var fullCalendarEvents = [];
    for (var event of google_calendar_events){
        if (event.start.dateTime){
            fullCalendarEvents.push({
                id: event.id,
                start: event.start.dateTime,
                end: event.end.dateTime,
                title: event.summary,
            }
        )} else {
            fullCalendarEvents.push({
                id: event.id,
                start: event.start.date,
                end: event.end.date,
                title: event.summary,
                allDay: true
            });
        };
    }
    return fullCalendarEvents;
}

module.exports = {
    getEventsFromCurrentWeek,
}