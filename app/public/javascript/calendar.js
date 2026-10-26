function startCalendar(config) {
    let lastGood = { key: null, events: [] };

    const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'timeGridWeek',
        slotMinTime: config.day_start,
        slotMaxTime: config.day_end,
        hiddenDays: config.hidden_days,
        headerToolbar: false,
        nowIndicator: true,
        slotEventOverlap: true,
        slotDuration: '01:00:00',
        expandRows: true,
        height: '100%',
        dayHeaderFormat: { weekday: 'short', day: 'numeric' },
        slotLabelFormat: { hour: 'numeric', meridiem: 'short' },
        eventDidMount: clampEventTitle,
        // The first layout sizes the hour rows before the all-day events are in, so the last
        // hours get pushed off the bottom; measure again once they're shown
        eventsSet: () => requestAnimationFrame(() => calendar.updateSize()),

        // FullCalendar asks for the visible range; keep showing the last good events if a fetch fails
        events: async (info, success) => {
            const key = `${info.startStr}|${info.endStr}`;
            try {
                const params = new URLSearchParams({ start: info.startStr, end: info.endStr });
                const response = await fetch(`/api/calendar?${params}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                lastGood = { key, events: await response.json() };
            } catch (err) {
                console.warn('Failed to update calendar events:', err);
            }
            success(lastGood.key === key ? lastGood.events : []);
        },
    });

    calendar.render();
    setInterval(() => calendar.refetchEvents(), config.calendar_update_duration);

    // The page can stay open for days: move to the current week/day when the date changes
    let today = new Date().toDateString();
    setInterval(() => {
        const now = new Date().toDateString();
        if (now !== today) {
            today = now;
            calendar.today();
        }
    }, 60 * 1000);
}

// Show as many whole lines of the title as fit in the event box
function clampEventTitle(info) {
    const main = info.el.querySelector('.fc-event-main');
    const title = info.el.querySelector('.fc-event-title');
    if (!main || !title) return;
    const mainStyle = getComputedStyle(main);
    const available = main.clientHeight - parseFloat(mainStyle.paddingTop) - parseFloat(mainStyle.paddingBottom);
    const lineHeight = parseFloat(getComputedStyle(title).lineHeight);
    title.style.webkitLineClamp = Math.max(1, Math.floor(available / lineHeight));
}
