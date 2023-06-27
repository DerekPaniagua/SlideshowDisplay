// Setup calendar initally
var calendar_element = document.getElementById('calendar');
var calendar = new FullCalendar.Calendar(calendar_element, {
    initialView: 'timeGridWeek',
    slotMinTime: '06:00:00',
    slotMaxTime: '18:00:00',
    hiddenDays: [0],
    headerToolbar: false,
    nowIndicator: true,
    slotEventOverlap: true,
    slotDuration: '01:00:00',
    expandRows: true,
});

calendar.render();

// Set Events to be updated according to config
fetch(`${document.URL}config`).then(async (res) => {
    const config = await res.json();
    setInterval(updateEvents, config.calendar_update_duration);
    updateEvents();
}).catch((reason) => {
    console.error(reason);
    console.error("Failed to fetch config for calendar!")
});

async function updateEvents() {
    console.log("Updating calendar events...");
    var response = await fetch(`${document.URL}calendar`);
    var events = await response.json();

    calendar.getEvents().forEach(event => event.remove());
    events.forEach(event => calendar.addEvent(event));
    calendar.render();
    console.log("Updated calendar events successfully!")
};