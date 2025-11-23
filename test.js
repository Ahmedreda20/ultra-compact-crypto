
import ulra from './index.js';


(async () => {
    const value  = await ulra.decrypt("3QjXlMQI4OpdPn2QczJlBQhqkLYBfJL79AnXVuGgiTkShVS14oqhBRkvqesieZBW0LGvLzRAd5ueECf5omf6nT", "f8a585b082324c67690a69d058cd0b3f")

    console.log(value)
})()