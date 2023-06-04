from PIL import Image
import logging
import glob

def load_images(images_file_path):
    # Get the list of image files in the directory
    images_locations = glob.glob(f"{images_file_path}/*.jpg")
    images_locations.extend(glob.glob(f"{images_file_path}/*.png"))
    images = []
    for image_file in images_locations:
        try:
            image = Image.open(image_file)
            images.append(image)
        except:
            logging.info(f"Unable to open {image_file}!")
            continue
    return images