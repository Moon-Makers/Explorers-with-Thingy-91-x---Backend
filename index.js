const coap = require('coap');
const { Firestore } = require('@google-cloud/firestore');

// Inicializa Firestore (usa variables de entorno para credenciales en Cloud Run)
const firestore = new Firestore();

// Función para parsear el mensaje recibido
function parseMessage(payload) {
  const text = payload.toString().trim();
  const lines = text.split(/\r?\n/);
  if (lines.length !== 4) throw new Error(`Invalid format: expected 4 lines, got ${lines.length}`);

  // Line 1: latitude,longitude
  const [latStr, lngStr] = lines[0].split(',');
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || isNaN(lng)) throw new Error('Invalid latitude or longitude');

  // Line 2: precision (e.g. 5.0 m)
  const precisionMatch = lines[1].trim().match(/^([\d.]+)\s*m$/);
  if (!precisionMatch) throw new Error('Invalid precision');
  const precision = parseFloat(precisionMatch[1]);

  // Line 3: date and time (e.g. 2025-07-29 14:23:45)
  const dateStr = lines[2].trim();
  const date = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(date.getTime())) throw new Error('Invalid date');

  // Line 4: device name
  const nombre = lines[3].trim();
  if (!nombre) throw new Error('Device name is empty');

  return {
    latitud: lat,
    longitud: lng,
    precision,
    timestamp: date.toISOString(),
    nombre,
    raw: payload.toString()
  };
}

// Servidor CoAP
const server = coap.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = Buffer.alloc(0);
    req.on('data', chunk => {
      body = Buffer.concat([body, chunk]);
    });
    req.on('end', () => {
      console.log('Payload recibido:\n%s', body.toString());
      try {
        // Nuevo endpoint para clima
        if (req.url === '/clima') {
          const climaData = parseClimaMessage(body);
          firestore.collection('clima_data').add(climaData)
            .then(() => {
              res.end('Climate data saved');
            })
            .catch(err => {
              console.error('Firestore error:', err);
              res.code = '5.00';
              res.end('Error saving to Firestore');
            });
          return;
        }
        // Default: ubicación
        const data = parseMessage(body);
        firestore.collection('iot_data').add(data)
          .then(() => {
            res.end('Data saved');
          })
          .catch(err => {
            console.error('Firestore error:', err);
            res.code = '5.00';
            res.end('Error saving to Firestore');
          });
      } catch (err) {
        res.code = '4.00';
        res.end('Invalid format: ' + err.message);
      }
    });
  } else {
    res.code = '4.05';
    res.end('Método no permitido');
  }
});

// Parser para clima
function parseClimaMessage(payload) {
  const text = payload.toString().trim();
  const lines = text.split(/\r?\n/);
  if (lines.length !== 5) throw new Error(`Invalid format: expected 5 lines, got ${lines.length}`);

  // Line 1: latitude,longitude
  const [latStr, lngStr] = lines[0].split(',');
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || isNaN(lng)) throw new Error('Invalid latitude or longitude');

  // Line 2: precision (e.g. 5.0 m)
  const precisionMatch = lines[1].trim().match(/^([\d.]+)\s*m$/);
  if (!precisionMatch) throw new Error('Invalid precision');
  const precision = parseFloat(precisionMatch[1]);

  // Line 3: date and time
  const dateStr = lines[2].trim();
  const date = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(date.getTime())) throw new Error('Invalid date');

  // Line 4: device name
  const nombre = lines[3].trim();
  if (!nombre) throw new Error('Device name is empty');

  // Line 5: sensor data (Temp: ... Humidity: ... Pressure: ... Gas: ... Ohms)
  const logLine = lines[4].trim();
  const regex = /Temp: ([\d.-]+)°C Humidity: ([\d.-]+)% Pressure: ([\d.-]+) kPa Gas: ([\d.-]+) Ohms/;
  const match = logLine.match(regex);
  if (!match) throw new Error('Invalid sensor log line format');
  const temperature = parseFloat(match[1]);
  const humidity = parseFloat(match[2]);
  const pressure = parseFloat(match[3]);
  const gas_resistance = parseFloat(match[4]);

  return {
    latitud: lat,
    longitud: lng,
    precision,
    timestamp: date.toISOString(),
    nombre,
    temperature,
    humidity,
    pressure,
    gas_resistance,
    raw: payload.toString()
  };
}

const PORT = process.env.PORT || 5683;
server.listen(PORT, () => {
  console.log(`Servidor CoAP escuchando en puerto ${PORT}`);
});
