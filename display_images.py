from PIL import ImageTk
import tkinter as tk
import glob

def slideshow(images, duration):
    root = tk.Tk()
    root.attributes("-fullscreen", True)
    root.title("Image Slideshow")

    # Create a Tkinter label to display the image
    image_label = tk.Label(root)
    image_label.pack(fill=tk.BOTH, expand=True)

    num_images = len(images)
    current_image = 0

    def show_image():
        nonlocal current_image
        image = images[current_image]
        image = image.resize((root.winfo_screenwidth(), root.winfo_screenheight()))
        photo = ImageTk.PhotoImage(image)
        image_label.config(image=photo)
        image_label.image = photo

        current_image = (current_image + 1) % num_images
        root.after(duration, show_image)

    # Start the slideshow
    show_image()
    root.mainloop()

# Duration in milliseconds to display each image
slideshow_duration = 2000