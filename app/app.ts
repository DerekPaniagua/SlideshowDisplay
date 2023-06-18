import express from "express";
import path from 'path';
import fs from 'fs';


// Local files
import { get_config } from './common';
import * as slideshow from "./slideshow"

// Setup
let image_list:string[] = [];
let last_index = 0;

const config = get_config();

const app = express();
app.use(express.static(__dirname + '/css'));
app.listen(3000, () => {
    console.log("Application Listening on port 3000");
});

// Endpoints
app.get("/", (req, res) => {
    res.sendFile(`${__dirname}/html/index.html`);
});

app.get("/image", async (req, res) => {
    // Refresh our images everytime the slideshow restarts
    if (image_list.length === last_index){
        let drive = slideshow.get_google_drive(config.google_credentials_path);
        image_list = await slideshow.get_file_names(drive);
        image_list.sort();
        await slideshow.refresh_images(config.images_path, drive);
        last_index = 0;
    }
    let full_path = path.join(__dirname, '/images', image_list[last_index]);
    let image_exists = fs.existsSync(full_path);
    res.sendFile(full_path);
    last_index += 1;
});

app.get("/test", (req, res) => {
    let drive = slideshow.get_google_drive(config.google_credentials_path);
    slideshow.refresh_images(config.images_path, drive);
    res.end();
})