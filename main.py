import json
import time
import logging

# Related Files
import fetch_calendar
import display_images
import load_images

def main():
    logging.basicConfig(filename='slideshow.log', level=logging.DEBUG)
    logging.info("Starting up slideshow program")

    config = {}
    with open("config.json", "r") as config:
        config = json.load(config)

    previous_folder = ""
    while True:
        try:
            # Check calendar for updates
            current_folder = fetch_calendar.get_current_folder_from_event()
            # Only update slideshow if current selected folder has updated
            if current_folder != previous_folder:
                previous_folder = current_folder
                images_file_path = f"{config['drive_path']}/{current_folder}"
                # Load and create new slideshow
                images = load_images.load_images(images_file_path)
                display_images.slideshow(images, config["slideshow_duration"])
            # Sleep
            time.sleep(config["update_duration"])
        except Exception as err:
            logging.error("Unexpected Error has occured!")
            logging.error(err)

if __name__ == "__main__":
    main()