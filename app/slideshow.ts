import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';

const accepted_file_types = ["jpg", "png", "gif"]

export function get_google_drive(key_file_path: string){
    const auth = new google.auth.GoogleAuth({
        keyFile: key_file_path,
        scopes: ["https://www.googleapis.com/auth/drive"]
    })
    return google.drive({version: "v3", auth});
}

export async function refresh_images(images_path: string, drive: drive_v3.Drive) {
    let response = await drive.files.list();

    if (!response.data.files) throw new Error("No files found in service account drive!");

    let images_to_download = response.data.files.filter(file => {
        let file_type = file.name!.split('.').at(-1);
        return accepted_file_types.includes(file_type!);
    });
    images_to_download.sort((a, b) => (a.name! > b.name!) ? 1 : -1)
    // Clear image cache folder
    for (let image of fs.readdirSync(images_path)){
        let file_path = path.join(images_path, image);
        fs.unlinkSync(file_path);
    }

    let download_promises: Promise<string>[] = [];

    // Download all images to folder
    for (let file of images_to_download) {
        download_promises.push(new Promise((resolve, reject) => {
            drive.files.get(
                {
                    fileId: file.id!,
                    alt: 'media'
                },
                {
                    responseType: 'arraybuffer'
                },
                (err, res: any) => {
                    if (err) return reject(err)
                    else {
                        fs.writeFileSync(path.join(images_path, file.name!), Buffer.from(res.data));
                        return resolve(`Finished downloading ${file.name!}`);
                    }
                });
        })
        )
    }
    await Promise.all(download_promises);
};

export async function get_file_names(drive: drive_v3.Drive) : Promise<string[]> {
    let response = await drive.files.list();
    if (!response.data.files) return [];
    let image_files = response.data.files.filter(file => {
        let file_type = file.name!.split('.').at(-1);
        return accepted_file_types.includes(file_type!);
    });
    return image_files.map(file => file.name!)
}
