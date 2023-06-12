import express from "express";

// Local files
import { retrieve_image_paths } from "./slideshow"

let image_list:string[] = [];
let last_index = 0;

const app = express();

app.use(express.static(__dirname + '/css'));

app.listen(3000, () => {
    console.log("Application Listening on port 3000");
});

app.get("/", (req, res) => {
    res.sendFile(`${__dirname}/index.html`);
});

app.get("/image", (req, res) => {
    let current_images = retrieve_image_paths("./src/images");

    // We don't care much for order, more if images have been added or removed
    for (let path of current_images){
        if (!image_list.includes(path)){
            image_list = current_images;
            last_index = image_list.length - 1;
            break
        }
    }

    // Move index
    if (last_index === image_list.length - 1){
        last_index = 0;
    } else {
        last_index += 1;
    }

    if (image_list.length === 0){
        res.end();
    } else {
        res.sendFile(image_list[last_index]);
    }
});