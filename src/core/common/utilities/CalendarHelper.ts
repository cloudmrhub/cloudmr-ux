/**
 * Convert timestamp in ISO 8601 to local time
 * @param timestamp
 */
export function convertTimestamp(timestamp: string) {
    try {
        // Create a new Date object from the timestamp
        let date = new Date(timestamp);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return timestamp; // Return original if invalid
        }

        // Format the date and time
        let year = date.getFullYear();
        let month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed in JavaScript
        let day = String(date.getDate()).padStart(2, '0');
        let hours = String(date.getHours()).padStart(2, '0');
        let minutes = String(date.getMinutes()).padStart(2, '0');
        let seconds = String(date.getSeconds()).padStart(2, '0');

        // Return the formatted string
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
        console.error('Error converting timestamp:', e);
        return timestamp;
    }
}