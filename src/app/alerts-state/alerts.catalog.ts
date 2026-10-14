// The alerts and reminders the demo knows about, copied from demos/alert-demo.html.
// Used by the Overview page (queue, score cards) and the Admin Triggers page.

export interface AlertButton {
  label: string;
  style: 'primary' | 'secondary' | 'unavailable';
  action: string;
}

export interface AlertInfo {
  type: 'alert' | 'reminder';
  name: string;
  title: string;
  message: string;
  buttons: AlertButton[];
  asset?: 'home' | 'car'; // reminders: which insurance score it counts toward
  penalty?: number; // reminders: score points added while unaddressed
  mascot?: string;
  camera?: boolean;
  serviceName?: string;
  uploadPrompt?: string;
  replacedMessage?: string;
  orderMessage?: string;
  calendarId?: number; // set for reminders from the /Calendar endpoint (see calendar-reminders.service.ts)
}

// ---------- THE LIST OF ALERTS ----------
// To add a new alert, copy one of these blocks and change the words.
// Each alert has:
//   type      - "reminder" (blue) or "alert" (red)
//   name      - what shows in the lists, and in the snooze message
//   title, message, and a list of buttons.
// Each button has a label, a style ("primary" = main button, "secondary" = gray),
// and an action (what happens when it's clicked).
export const ALERTS: readonly AlertInfo[] = [
  {
    type: "reminder",
    name: "Replace Fire Extinguisher",
    asset: "home",   // counts toward the Home insurance score
    penalty: 12,   // insurance score points added while this is unaddressed
    title: "Reminder",
    message: "Fire Extinguisher in the garage needs to be replaced.",
    mascot: "extinguisher",   // show this Alert Girl picture
    // Messages used by the "Mark as replaced" and "Order Replacement" buttons
    uploadPrompt: "Please upload a photo of the new extinguisher with the receipt clearly visible.",
    replacedMessage: "Extinguisher marked as replaced.",
    orderMessage: "A replacement extinguisher matching the same specifications has been ordered and will be shipped to you.",
    buttons: [
      { label: "Mark as replaced",  style: "primary",   action: "replaced" },
      { label: "Order Replacement", style: "secondary", action: "orderReplacement" },
      { label: "Dismiss",           style: "secondary", action: "dismiss" }
    ]
  },
  {
    type: "reminder",
    name: "Replace Furnace Filter",
    asset: "home",   // counts toward the Home insurance score
    penalty: 7,    // insurance score points added while this is unaddressed
    title: "Reminder",
    message: "It is time to replace your furnace filters. " +
             "This keeps your air quality high and helps to prevent fires.",
    mascot: "filter",   // show this Alert Girl picture
    uploadPrompt: "Please upload a photo of the new furnace filter with the receipt clearly visible.",
    replacedMessage: "Furnace filter marked as replaced.",
    orderMessage: "Replacement furnace filters matching the same specifications have been ordered and will be shipped to you.",
    buttons: [
      { label: "Mark as replaced",  style: "primary",   action: "replaced" },
      { label: "Order Replacement", style: "secondary", action: "orderReplacement" },
      { label: "Call for Service",  style: "secondary", action: "callService" },
      { label: "Dismiss",           style: "secondary", action: "dismiss" }
    ]
  },
  {
    type: "reminder",
    name: "Replace Smoke Alarm",
    asset: "home",   // counts toward the Home insurance score
    penalty: 15,   // insurance score points added while this is unaddressed
    title: "Reminder",
    message: "Your smoke alarm is due to be replaced. " +
             "Smoke alarms should be replaced every 10 years so they work when you need them.",
    mascot: "install",   // show this Alert Girl picture
    uploadPrompt: "Please upload a photo of the new smoke alarm with the receipt clearly visible.",
    replacedMessage: "Smoke alarm marked as replaced.",
    orderMessage: "A replacement smoke alarm matching the same specifications has been ordered and will be shipped to you.",
    buttons: [
      { label: "Mark as replaced",  style: "primary",   action: "replaced" },
      { label: "Order Replacement", style: "secondary", action: "orderReplacement" },
      { label: "Dismiss",           style: "secondary", action: "dismiss" }
    ]
  },
  // ----- CAR REMINDERS -----
  {
    type: "reminder",
    name: "Change Oil",
    asset: "car",    // counts toward the Car insurance score
    penalty: 6,
    title: "Reminder",
    message: "According to our records it is time to change your oil.",
    serviceName: "Oil change",
    uploadPrompt: "Please upload a photo of your oil change receipt.",
    replacedMessage: "Oil change marked as done.",
    buttons: [
      { label: "Mark as Replaced", style: "primary",   action: "replaced" },
      { label: "Schedule Change",  style: "secondary", action: "schedule" },
      { label: "Dismiss",          style: "secondary", action: "dismiss" }
    ]
  },
  {
    type: "reminder",
    name: "Replace Tires",
    asset: "car",
    penalty: 12,
    title: "Reminder",
    message: "According to our records it is time to change your tires.",
    serviceName: "Tire replacement",
    uploadPrompt: "Please upload a photo of your new tires with the receipt clearly visible.",
    replacedMessage: "Tires marked as replaced.",
    buttons: [
      { label: "Mark as Replaced", style: "primary",   action: "replaced" },
      { label: "Schedule Change",  style: "secondary", action: "schedule" },
      { label: "Dismiss",          style: "secondary", action: "dismiss" }
    ]
  },
  {
    type: "reminder",
    name: "Replace Brake Pads",
    asset: "car",
    penalty: 15,
    title: "Reminder",
    message: "According to our records it is time to change your brake pads.",
    serviceName: "Brake pad replacement",
    uploadPrompt: "Please upload a photo of your brake pad replacement receipt.",
    replacedMessage: "Brake pads marked as replaced.",
    buttons: [
      { label: "Mark as Replaced", style: "primary",   action: "replaced" },
      { label: "Schedule Change",  style: "secondary", action: "schedule" },
      { label: "Dismiss",          style: "secondary", action: "dismiss" }
    ]
  },
  {
    type: "alert",
    name: "Smoke alarm",
    camera: true,    // has a security camera, so "View Security Feed" works
    mascot: "smoke",   // show this Alert Girl picture
    title: "ALERT",
    message: "Smoke Alarm triggered, possible fire.",
    buttons: [
      { label: "Call Emergency Services",     style: "primary",   action: "call911" },
      { label: "View Security Feed",          style: "secondary", action: "securityFeed" },
      { label: "Snooze alarm for 15 minutes", style: "secondary", action: "snooze" },
      { label: "Dismiss",                     style: "secondary", action: "dismiss" }
    ]
  },
  {
    type: "alert",
    name: "Water level",
    mascot: "water",   // show this Alert Girl picture
    title: "Water Level High in Crock",
    message: "The water level in your crock is high indicating the potential for flooding. " +
             "Please check your sump-pump is working properly. " +
             "You may want to move items which are vulnerable to water damage away from the crock.",
    buttons: [
      { label: "Call Plumber",          style: "primary",   action: "callPlumber" },
      { label: "Dismiss",               style: "secondary", action: "dismiss" },
      { label: "Snooze for 15 minutes", style: "secondary", action: "snooze" },
      { label: "View Security Feed",    style: "unavailable", action: "securityFeed" }
    ]
  },
  {
    type: "alert",
    name: "Air quality",
    title: "Air Quality Low",
    mascot: "air",   // show this Alert Girl picture
    message: "Air quality is poor AQI over 100. " +
             "Your air purifiers are not currently able to keep your air at ideal levels. " +
             "You may wish to check to ensure the filters do not need to be changed.",
    buttons: [
      { label: "Dismiss",               style: "secondary", action: "dismiss" },
      { label: "Snooze for 15 minutes", style: "secondary", action: "snooze" },
      { label: "Maximize Air Quality",  style: "primary",   action: "maximizeAir" },
      { label: "View Security Feed",    style: "unavailable", action: "securityFeed" }
    ]
  }
];

// ---------- INSURANCE SCORE ----------
// Demo numbers. Change these to try different homes and cars.
export const SCORES = {
  home: { value: 155000, baseline: 1200, costPerPoint: 6 },  // $155k house, ~$1,200/yr insurance
  car:  { value: 25000,  baseline: 1800, costPerPoint: 9 }   // $25k car, ~$1,800/yr insurance
};

// Letter grade for a number of penalty points.
export function gradeFor(points: number): string {
  if (points === 0)  return "A+";
  if (points <= 5)   return "A";
  if (points <= 10)  return "A-";
  if (points <= 15)  return "B+";
  if (points <= 20)  return "B";
  if (points <= 25)  return "B-";
  if (points <= 30)  return "C+";
  if (points <= 35)  return "C";
  if (points <= 40)  return "C-";
  return "D";
}
