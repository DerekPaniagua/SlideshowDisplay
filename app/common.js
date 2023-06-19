const fs = require('fs');

function get_config(){
    const config = fs.readFileSync('./app/data/config.json', 'utf8');
    return JSON.parse(config);
}

module.exports = {
    get_config
}