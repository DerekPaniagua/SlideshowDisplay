import fs from 'fs';

export function get_config(){
    const config = fs.readFileSync('./app/data/config.json', 'utf8');
    return JSON.parse(config);
}