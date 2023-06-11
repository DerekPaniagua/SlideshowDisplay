function retrieve_image_paths(filePath, callback) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif']; // Add more extensions if needed
  
    // Check if FileReader is supported
    if (typeof FileReader !== 'undefined') {
      const inputElement = document.createElement('input');
      inputElement.type = 'file';
      inputElement.multiple = true;
  
      // Event listener for when files are selected
      inputElement.addEventListener('change', function (event) {
        const files = event.target.files;
        const imageFiles = [];
  
        // Iterate over the selected files
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  
          // Check if the file is an image file
          if (imageExtensions.includes(fileExtension)) {
            imageFiles.push(file);
          }
        }
  
        // Pass the image files to the callback function
        if (typeof callback === 'function') {
          callback(imageFiles);
        }
      });
  
      // Trigger the file input dialog
      inputElement.click();
    } else {
      // FileReader is not supported
      console.error('FileReader is not supported in this browser.');
    }
  }
  