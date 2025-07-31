# CoAP Firestore Backend

This project is a Node.js backend designed to run on Google Cloud Run or Compute Engine. It receives data from IoT devices using the CoAP protocol and stores it in Google Firestore.

## Usage
1. Install dependencies:
   ```
   npm install
   ```
2. Run the server locally:
   ```
   npm start
   ```
3. The server will listen on port 5683 (CoAP).

## Endpoints
- `/` (default): Receives and stores device location data.
- `/clima`: Receives and stores environmental sensor data (temperature, humidity, pressure, gas resistance).

## Data formats
### Location data
```
latitude,longitude
precision m
yyyy-mm-dd hh:mm:ss
device_name
```

### Climate sensor data
```
latitude,longitude
precision m
yyyy-mm-dd hh:mm:ss
device_name
$temp °C Humidity: $hum % Pressure: $pres kPa Gas: $gas Ohms
```

## Deploy to Google Cloud Run or Compute Engine
- Make sure to set up Google Cloud credentials using environment variables or service account JSON.
- The service will use Firestore to store received data.

## Main structure
- `index.js`: CoAP server and Firestore logic.

## Notes
- Endpoints only accept POST requests with the specified format.
- Data is stored in the `iot_data` or `clima_data` collections in Firestore depending on the endpoint.

