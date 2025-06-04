const dayjs = require("dayjs");

module.exports = class TimeUtils {
    static formatCreatedAt(data, column_name = 'createdAt') {
        let timestampMs;
        if(column_name == 'createdAt') {
            timestampMs = data.createdAt._seconds * 1000 + Math.floor(data.createdAt._nanoseconds / 1e6);
        } else {
            timestampMs = data[column_name]._seconds * 1000 + Math.floor(data[column_name]._nanoseconds / 1e6);
        }
        return dayjs(timestampMs).add(7, 'hours').toDate()
    }
}