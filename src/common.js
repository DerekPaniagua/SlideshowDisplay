async function get_config(){
    let config_response = await fetch("./config.json");
    console.log(config_response.json());
    return config_response.json();
}