// Mock home sensors for the Overview's "Sensors overview" card (and the Overview AI's context).
// Replace with real sensor data when it's available.

export type SensorIcon = 'flame' | 'thermometer' | 'alarm' | 'droplet' | 'snowflake' | 'garage';

export interface HomeSensor {
  name: string;
  location: string;
  reading: string;
  detail: string;
  status: 'ok' | 'check';
  icon: SensorIcon;
}

export const HOME_SENSORS: HomeSensor[] = [
  {
    name: 'Thermostat',
    location: 'Living room',
    reading: '71 °F',
    detail: 'Heating to 72 °F · humidity 41%',
    status: 'ok',
    icon: 'thermometer',
  },
  {
    name: 'Smoke & CO detectors',
    location: '4 devices',
    reading: 'All clear',
    detail: 'Lowest battery 62%',
    status: 'ok',
    icon: 'alarm',
  },
  {
    name: 'Water leak sensor',
    location: 'Laundry room',
    reading: 'Dry',
    detail: 'No leaks in the last 30 days',
    status: 'ok',
    icon: 'droplet',
  },
  {
    name: 'Freezer',
    location: 'Garage',
    reading: '2 °F',
    detail: 'Door opened 3× today',
    status: 'ok',
    icon: 'snowflake',
  },
  {
    name: 'Garage door',
    location: 'Garage',
    reading: 'Closed',
    detail: 'Last opened 7:42 AM',
    status: 'ok',
    icon: 'garage',
  },
];

// A sensor the home is missing, and what connecting it would save on home insurance.
export const MISSING_SENSOR = {
  name: 'Sump pump sensor',
  yearlySavings: 50,
  reason: 'catches a failing sump pump before your basement floods',
};
