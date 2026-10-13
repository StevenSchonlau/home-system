import type { SensorReading } from './sensor-data.service';

const MOCK_SENSORS = [
  { accountName: 'home', sensorType: 'Thermostat', DataKey: 'temperature', start: 21 },
  { accountName: 'home', sensorType: 'Thermostat', DataKey: 'humidity', start: 45 },
  { accountName: 'home', sensorType: 'PowerMeter', DataKey: 'watts', start: 800 },
  { accountName: 'home', sensorType: 'Crockpot', DataKey: 'temperature', start: 85 },
  { accountName: 'home', sensorType: 'Outdoor', DataKey: 'temperature', start: 12 },
  // Different account: should be filtered out.
  { accountName: 'neighbor', sensorType: 'Thermostat', DataKey: 'temperature', start: 19 },
];

// Fake API: starts with 24h of half-hourly history, then adds one new reading
// per sensor each time it is called, so the dashboard has something live to show.
export function createMockApi(): () => SensorReading[] {
  const readings: SensorReading[] = [];
  const current = MOCK_SENSORS.map((sensor) => sensor.start);
  let nextId = 1;

  const addReadings = (time: number) => {
    MOCK_SENSORS.forEach((sensor, i) => {
      current[i] = Math.round((current[i] + (Math.random() - 0.5) * sensor.start * 0.04) * 100) / 100;
      readings.push({
        id: nextId++,
        sensorType: sensor.sensorType,
        dateTime: new Date(time).toISOString(),
        accountName: sensor.accountName,
        DataKey: sensor.DataKey,
        DataValue: current[i],
      });
    });
  };

  const halfHour = 30 * 60 * 1000;
  for (let time = Date.now() - 24 * 60 * 60 * 1000; time < Date.now(); time += halfHour) {
    addReadings(time);
  }

  return () => {
    addReadings(Date.now());
    return [...readings];
  };
}
