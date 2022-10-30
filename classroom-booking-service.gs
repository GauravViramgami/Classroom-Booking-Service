const GLOBAL = {
  SHEET_ID: "1jV2Mi9ekiZAHA77XaZ1zoFVSlUhwWHDC1FBQBF9HA2k"
}

function doPost(e){
  return handleResponse(e);
}

function handleResponse(e) {
  // shortly after my original solution Google announced the LockService[1]
  // this prevents concurrent access overwritting data
  // [1] http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
  // we want a public lock, one that locks for all invocations
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);  // wait 30 seconds before conceding defeat.
  try {
    // Logger.log(e);
    // next set where we write the data - you could write to multiple/alternate destinations
    // var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var doc = SpreadsheetApp.openById(GLOBAL.SHEET_ID);
    var room = JSON.parse(e.postData.contents)["room"];
    var email = JSON.parse(e.postData.contents)["email"];
    var sheet = doc.getSheetByName(room.slice(2, room.length));
    
    // we'll assume header is in row 1 but you can override with header_row in GET/POST data
    var rows = [];
    if (sheet.getLastRow() > 1 ) {
      rows = sheet.getRange(2,1,sheet.getLastRow()-1, sheet.getLastColumn()).getValues();
    }

    var flag = -1;
    for(var i = 0; i < rows.length; i++) {
      if (rows[i][0].toString() === email) {
        if (verifyTimeFrame(new Date(rows[i][4]))) {
          if (rows[i][6] == "Yet to Scan") {
            sheet.getRange(i + 2, 7, 1, 1).setValues([["Approved"]]);
            flag = i;
            break;
          } 
        }
      }
    }
    
    // return json success results
    if (flag === -1) {
      return ContentService
          .createTextOutput(JSON.stringify({"result":"no booking", "start_time": "-1", "end_time":"-1"}))
          .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService
          .createTextOutput(JSON.stringify({"result":"approved", "start_time": rows[flag][4],"end_time": rows[flag][5]}))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(e){
    // if error return this
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": e}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally { //release lock
    lock.releaseLock();
  }
}

function verifyTimeFrame (time) {
  var cur_time = new Date();
  var event_time = time;

  return (Math.abs((cur_time - event_time)/(1000 * 60)) <= 15);
}

/**
 * Helper function to get a new Date object relative to the current date.
 * @param {number} daysOffset The number of days in the future for the new date.
 * @param {number} hour The hour of the day for the new date, in the time zone
 *     of the script.
 * @return {Date} The new date.
 */
function getRelativeDate(daysOffset, hour) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

/**
 * Retrieve and log events from the given calendar that have been modified
 * since the last sync. If the sync token is missing or invalid, log all
 * events from up to a month ago (a full sync).
 *
 * @param {string} calendarId The ID of the calender to retrieve events from.
 * @param {boolean} fullSync If true, throw out any existing sync token and
 *        perform a full sync; if false, use the existing sync token if possible.
 */
function logSyncedEvents(calendarId, fullSync) {
  const properties = PropertiesService.getUserProperties();
  const options = {
    maxResults: 100
  };
  const syncToken = properties.getProperty('syncToken');
  if (syncToken && !fullSync) {
    options.syncToken = syncToken;
  } else {
    // Sync events up to thirty days in the past.
    options.timeMin = getRelativeDate(-30, 0).toISOString();
  }
  // Retrieve events one page at a time.
  let events;
  let pageToken;
  do {
    try {
      options.pageToken = pageToken;
      console.log(options);
      events = Calendar.Events.list(calendarId, options);
    } catch (e) {
      // Check to see if the sync token was invalidated by the server;
      // if so, perform a full sync instead.
      if (e.message === 'Sync token is no longer valid, a full sync is required.') {
        properties.deleteProperty('syncToken');
        logSyncedEvents(calendarId, true);
        return;
      }
      throw new Error(e.message);
    }
    if (events.items && events.items.length === 0) {
      Logger.log('No events found.');
    }
    for (const event of events.items) {
      if (event.status === 'cancelled') {
        // Logger.log('Event id %s was cancelled.', event.id);
        continue;
      }
      if (event.start.date) {
        const start = new Date(event.start.date);
        // Logger.log('%s (%s)', event.summary, start.toLocaleDateString());
        continue;
      }
      // Events that don't last all day; they have defined start times.
      const start = new Date(event.start.dateTime);
      // Logger.log('%s (%s)', event.summary, start.toLocaleString());
    }
    pageToken = events.nextPageToken;
  } while (pageToken);
  properties.setProperty('syncToken', events.nextSyncToken);
  return events.items;
}

var RECURRING_KEY = "recurring";
var ARGUMENTS_KEY = "arguments";

/**
 * Sets up the arguments for the given trigger.
 *
 * @param {Trigger} trigger - The trigger for which the arguments are set up
 * @param {*} functionArguments - The arguments which should be stored for the function call
 * @param {boolean} recurring - Whether the trigger is recurring; if not the 
 *   arguments and the trigger are removed once it called the function
 */
function setupTriggerArguments(trigger, functionArguments, recurring) {
  var triggerUid = trigger.getUniqueId();
  var triggerData = {};
  triggerData[RECURRING_KEY] = recurring;
  triggerData[ARGUMENTS_KEY] = functionArguments;

  PropertiesService.getScriptProperties().setProperty(triggerUid, JSON.stringify(triggerData));
}

/**
 * Function which should be called when a trigger runs a function. Returns the stored arguments 
 * and deletes the properties entry and trigger if it is not recurring.
 *
 * @param {string} triggerUid - The trigger id
 * @return {*} - The arguments stored for this trigger
 */
function handleTriggered(triggerUid) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var triggerData = JSON.parse(scriptProperties.getProperty(triggerUid));

  if (!triggerData[RECURRING_KEY]) {
    deleteTriggerByUid(triggerUid);
  }

  return triggerData[ARGUMENTS_KEY];
}

/**
 * Deletes trigger arguments of the trigger with the given id.
 *
 * @param {string} triggerUid - The trigger id
 */
function deleteTriggerArguments(triggerUid) {
  PropertiesService.getScriptProperties().deleteProperty(triggerUid);
}

/**
 * Deletes a trigger with the given id and its arguments.
 * When no project trigger with the id was found only an error is 
 * logged and the function continues trying to delete the arguments.
 * 
 * @param {string} triggerUid - The trigger id
 */
function deleteTriggerByUid(triggerUid) {
  if (!ScriptApp.getProjectTriggers().some(function (trigger) {
    if (trigger.getUniqueId() === triggerUid) {
      ScriptApp.deleteTrigger(trigger);
      return true;
    }

    return false;
  })) {
    console.error("Could not find trigger with id '%s'", triggerUid);
  }

  deleteTriggerArguments(triggerUid);
}

function checkEventStatus(event) {
  var functionArguments = handleTriggered(event.triggerUid);
  var calender_id = functionArguments[0];
  var event_id = functionArguments[1];
  doc = SpreadsheetApp.openById(GLOBAL.SHEET_ID);
  var sheet = doc.getSheetByName(id_to_room[calender_id]);

  var rows = [];
  if (sheet.getLastRow() > 1 ) {
    rows = sheet.getRange(2,1,sheet.getLastRow()-1, sheet.getLastColumn()).getValues();
  }

  for(var i = 0; i < rows.length; i++) {
    if (rows[i][1].toString() === event_id) {
      if (rows[i][6] != "Approved") {
        sheet.getRange(i + 2, 7, 1, 1).setValues([["Rejected"]]);
        break;
      }
    }
  }

  Calendar.Events.remove(calender_id, event_id);
}

const id_to_room = {
  "viramgami.g@iitgn.ac.in": "7/101"
};

function onEventCreate(e) {
  var new_events = logSyncedEvents(e.calendarId, false); 
  var confirmed_events = [];

  for (const event of new_events) {
    if (event.status === 'cancelled' || event.start.date) {
      continue;
    }
    confirmed_events.push(event);

    var triggerTime = new Date(event.start.dateTime);
    triggerTime.setMinutes(triggerTime.getMinutes() + 15);
    var trigger = ScriptApp.newTrigger("checkEventStatus")
    .timeBased()
    .at(triggerTime)
    .create();

    setupTriggerArguments(trigger, [e.calendarId, event.id], false);
  }

  doc = SpreadsheetApp.openById(GLOBAL.SHEET_ID);
  var sheet = doc.getSheetByName(id_to_room[e.calendarId]);
  var nextRow = sheet.getLastRow() + 1; // get next row
  var rows = [];
  for (const event of confirmed_events) {
    rows.push([event.creator.email, event.id, event.summary, event.created, event.start.dateTime, event.end.dateTime, "Yet to Scan"]);
  }
  if (rows.length > 0) {
    sheet.getRange(nextRow, 1, rows.length, rows[0].length).setValues(rows);
  }
}