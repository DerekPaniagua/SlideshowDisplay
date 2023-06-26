fetch(`${document.URL}calendar`).then(async function (response) {
    var calendar_element = document.getElementById('calendar');
    var events = await response.json();
    var calendar = new FullCalendar.Calendar(calendar_element, {
        initialView: 'timeGridWeek',
        slotMinTime: '06:00:00',
        slotMaxTime: '18:00:00',
        hiddenDays: [0],
        headerToolbar: false,
        nowIndicator: true,
        slotEventOverlap: true,
        slotDuration: '01:00:00',
        events,
    });

    calendar.render();
});