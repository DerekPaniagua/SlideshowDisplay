const express = require('express');
const calendar = require('./calendar')
const slideshow = require('./slideshow');
const common = require('./common');
const path = require('node:path');

console.info("Starting up server...")

// Setup
let image_list = [];
let last_index = 0;
const config = common.get_config();
check_and_update_images().then(() => {setInterval(check_and_update_images, config.google_drive_refresh_duration);});


// Web Server
const app = express();
app.use(express.static(`${__dirname}/public`));
app.listen(3000, () => {
    console.info("Application Listening on port 3000");
});

// Endpoints
app.get("/", (req, res) => {
    res.sendFile(`${__dirname}/html/index.html`);
});

app.get("/config", (req, res) => {
    let html_config = {
        slideshow_duration: config.slideshow_duration,
        calendar_update_duration: config.calendar_update_duration,
    };
    res.json(html_config);
});

app.get("/image", async (req, res) => {
    if (image_list.length === 0){
        res.end()
        return;
    }
    console.info(`Returning ${image_list[last_index]}`);
    let full_path = path.join(__dirname, '/images', image_list[last_index]);
    res.sendFile(full_path);
    last_index = (last_index + 1) % image_list.length;
});

app.get("/calendar", async (req, res) => {
    var events = await calendar.getEventsFromCurrentWeek(config.google_credentials_path);
    res.send(events);
});

// Helper Fucntions
async function check_and_update_images(){
    console.info("Checking google drive for image updates...");
    let drive = slideshow.get_google_drive(config.google_credentials_path);
    let new_image_list = await slideshow.get_file_names(drive);
    let hasChanged = false;
    for (let image_name of new_image_list){
        if (!image_list.includes(image_name)){
            hasChanged = true;
            break;
        }
    }
    if (hasChanged || new_image_list.length !== image_list.length){
        console.info("Change detected, refreshing images...");
        image_list = new_image_list;
        image_list.sort();
        await slideshow.refresh_images(config.images_path, drive);
        console.info(`Successfully fetched ${image_list.length} images!`)
    }
};