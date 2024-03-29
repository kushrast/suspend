//Work Log Javascript File

var isWorkingOnTask = false;
var shouldUpdateTicker = true;

var selectedTopicID = "";
var currTimeFormatted = null;
var eventsLogList = [];
var topicsDictionary = {};

var workStartedTimestamp = "";
var currSessionTimeElapsedSeconds = 0;
var previousSessionsTimeElapsedSeconds = 0;

var timeElapsedAtAlert = 0;
var timestampAtAlert = "";
var timeoutVar = null;

var show_events = true;

var MODAL_TIME_CONSTANT = 900000;

$( document ).ready(function() {
	setupEnvironment();
});

/* Setup environment when page is first loaded */
function setupEnvironment() {
	console.log("Setting up Suspend Application");
	hideTemplates();
	startClock();
	setupStorage();
	render();
	attachListeners();
	checkFileAPI();
}

/* Hide templates used for dynamic content generation */
function hideTemplates() {
	$("#template").hide();
	$("#alert-template").hide();
	$("#event-template").hide();
	$("#show-events").hide();
	$("#stop-timer").hide();
}

/* Pull data from storage when page first loads */
function setupStorage() {
	eventsLogList = JSON.parse(localStorage.getItem("events"));
	if (eventsLogList == null) {
		eventsLogList = [];
	}

	topicsDictionary = JSON.parse(localStorage.getItem("topics"));
	if (topicsDictionary == null) {
		topicsDictionary = {};
	}

	selectedTopicID = localStorage.getItem("selectedTopicID");

	if (selectedTopicID != "") {
		if (localStorage.getItem("workStartedTimestamp") != "" && localStorage.getItem("workStartedTimestamp") != null) {
			workStartedTimestamp = Date.parse(localStorage.getItem("workStartedTimestamp"));
		}

		shouldUpdateTicker = false;
		if (localStorage.getItem("isWorkingOnTask") == "true") {
			isWorkingOnTask = true;
		}

		if (isWorkingOnTask) {
			checkIfActive();
		}
	}
}

/* Start clock timer */
function startClock() {
	clockTick();
}

/* Re-render topic and events lists */
function render() {
	console.log("Re-rendering")
	if (selectedTopicID != "" && selectedTopicID != null) {
		document.title = "Work Log - " + topicsDictionary[selectedTopicID].name;
		$("#time-elapsed-header").html(formatCounter(topicsDictionary[selectedTopicID].time));
	}
	renderTopics();
	renderEvents();
}

/* Recreates topics list. Should also highlight the active topic (if there is one) */
function renderTopics() {
	$("#list_items").html("");

	for (var key in topicsDictionary) {
		var topicDiv = $("#template").clone();
		var topicButton = topicDiv.find("#work-template");
		var timeElapsed = topicDiv.find("#time-elapsed");

		timeElapsed.html(formatCounter(topicsDictionary[key].time));
		topicButton.html(topicsDictionary[key].name);
		topicButton.val(topicsDictionary[key].id);
		topicButton.attr("id", topicsDictionary[key].id);
		topicDiv.attr("id", "work"+topicsDictionary[key].id);
		timeElapsed.attr("id", "time-elapsed-"+topicsDictionary[key].id);
		topicDiv.find("#edit-topic-input").hide();
		topicDiv.find("#time-note-group").hide();
		$("#list_items").append(topicDiv);
		topicDiv.show();
	}

	setActiveTopic();
}

function hideEvents() {
	show_events = false;
	renderEvents();

	$("#hide-events").hide();
	$("#show-events").show();
}

function showEvents() {
	show_events = true;
	renderEvents();

	$("#hide-events").show();
	$("#show-events").hide();
}

/* Recreates the events list. Only shows the latest 10 events. */
function renderEvents() {
	$("#event-items").html("");

	if (show_events) {
		var i = 0;
		// if (eventsLogList.length > 10) {
		// 	i = eventsLogList.length - 10;
		// }
		for (;i < eventsLogList.length; i++) {
			var eventsListItem = $("#event-template").clone();
			eventsListItem.html(eventsLogList[i]);
			$("#event-items").append(eventsListItem);
			eventsListItem.show();
		}
	}
		$("#event-items").scrollTop($("#event-items")[0].scrollHeight);
}

/* Attaches button listeners */
function attachListeners() {
	$("body").on('click', '.topicButton', selectTopic);
	$("body").on('click', '#delete-topic', deleteTopic);
	$("body").on('click', '#edit-topic', editTopic);
	$("body").on('click', '#start-timer', startTimer);
	$("body").on('click', '#stop-timer', stopTimer);
	$("body").on('click', '#save-button', saveData);
	$("body").on('click', '#clear-data', clearData);
	$("body").on('click', '#is-active-modal-reject', modalReject);
	$("body").on('click', '#is-active-modal-accept', modalAccept);
	$("body").on('click', '#hide-events', hideEvents);
	$("body").on('click', '#show-events', showEvents);

	$("#import-button").change(importData);

	$("#list-submit").on('keypress', function(e) {
	if (e.which == 13) {

		var id = addNewTopic($(this).val());

		$(this).val("");
		render();
		}
	});

	$("body").on('click', '#create-work-item', function() {
		addNewTopic($("#list-submit").val());
		$("#list-submit").val("");
		render();
	});

	$("body").on('keypress', "#add-time-note", function(e) {
	if (e.which == 13) {

		var id = addNewNote($(this).val());

		$(this).val("");
		render();
		}
	});

	$("body").on('keypress', "#edit-topic-input", function(e) {
	if (e.which == 13) {

		changeTopicName($(this));
		render();
		}
	});

	$("body").on('click', '#submit-note', function() {
		var list = $(this).parent().parent().find("#add-time-note");
		addNewNote(list.val());
		list.val("");
		render();
	});
}

/* Checks if browser can read files for file import */
function checkFileAPI() {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        reader = new FileReader();
        return true; 
    } else {
        alert('The File APIs are not fully supported by your browser. Fallback required.');
        return false;
    }
}

/* Fetches current time and updates timer/clock */
function clockTick() {
	var current_time = new Date();
	 currTimeFormatted = formatTimeElement(current_time);

	updateTimer(current_time);
	setTimeout(clockTick, 500);
}
/* Updates Work Item Timer */
function updateTimer(current_time) {
	if (isWorkingOnTask && shouldUpdateTicker) {
	 	currSessionTimeElapsedSeconds = (current_time.valueOf() - workStartedTimestamp.valueOf()) / 1000;

	 	var timeSeconds = previousSessionsTimeElapsedSeconds + currSessionTimeElapsedSeconds;
	 	var timeString = formatCounter(timeSeconds);

	 	$("#time-elapsed-header").html(timeString);
	 	$("#time-elapsed-"+selectedTopicID).html(timeString);
	 }
}

/* Formats a full datetime string */
function formatTimeElement(date) {
	h = date.getHours();
	m = date.getMinutes();
	s = date.getSeconds();
	if (m < 10)
		m = `0${m}`;
	if (s < 10)
		s = `0${s}`;
	return `${h}:${m}:${s}`;
}

/* Formats the work item timer value depending on length of time worked */
function formatCounter(timeSeconds) {
 	var timeString;
 	if (timeSeconds < 60) {
 		timeString = Math.floor(timeSeconds) + "s";
 	} else if (timeSeconds < 3600) {
 		timeString = Math.floor(timeSeconds / 60) + "m " + Math.floor(timeSeconds % 60) + "s";
 	} else {
 		timeString = Math.floor(timeSeconds / 3600) + "h " + Math.floor((timeSeconds % 3600) / 60) + "m " + Math.floor(timeSeconds % 60) + "s";
 	}

 	return timeString;
}

/* Stops timer (if running) */
function stopTimer() {
	stopTimerUtils(currSessionTimeElapsedSeconds, currTimeFormatted);
}

function stopTimerUtils(timeElapsed, time) {
	if (isWorkingOnTask) {
		console.log("Stopping Timer");
		isWorkingOnTask = false;
		shouldUpdateTicker = false;
		previousSessionsTimeElapsedSeconds += currSessionTimeElapsedSeconds;
		topicsDictionary[selectedTopicID].time = previousSessionsTimeElapsedSeconds;
		currSessionTimeElapsedSeconds = 0;

		var eventString = `Stopped working on '${topicsDictionary[selectedTopicID].name}'`;
		pushEvent(eventString);

		$("#elapsed-button").prop("disabled", true);
		$("#topic").removeClass("btn-outline-primary").addClass("btn-light");
		$("#time-elapsed-"+selectedTopicID).prop("disabled", true);
		$("#stop-timer").hide();
		$("#start-timer").show();
		
		setActiveTopic();

		localStorage.setItem("isWorkingOnTask", false);
		storeTopics();
	}
	clearTimeout(timeoutVar);
}

/* Loads timer information */
function loadTimer() {
	previousSessionsTimeElapsedSeconds = topicsDictionary[selectedTopicID].time;
	$("#time-elapsed-header").html(formatCounter(previousSessionsTimeElapsedSeconds));
	$("#time-elapsed-"+selectedTopicID).html(formatCounter(previousSessionsTimeElapsedSeconds));
}

/* Starts the timer (if stopped) */
function startTimer() {
	if (!isWorkingOnTask) {
		console.log("Starting timer");
		currSessionTimeElapsedSeconds = 0;
		loadTimer();
		workStartedTimestamp = new Date();
		isWorkingOnTask = true;
		shouldUpdateTicker = true;
		var eventString = `Started working on '${topicsDictionary[selectedTopicID].name}'`;
		pushEvent(eventString);

		$("#elapsed-button").prop("disabled", false);
		$("#topic").removeClass("btn-light").addClass("btn-outline-primary");
		$("#time-elapsed-"+selectedTopicID).prop("disabled", false);
		
		setActiveTopic();

		timeoutVar = setTimeout(checkIfActive, MODAL_TIME_CONSTANT);

		$("#stop-timer").show();
		$("#start-timer").hide();

		localStorage.setItem("workStartedTimestamp", workStartedTimestamp);
		localStorage.setItem("isWorkingOnTask", true);
	}
}

function checkIfActive() {
	timeElapsedAtAlert = currSessionTimeElapsedSeconds;
	timestampAtAlert = currTimeFormatted;
	shouldUpdateTicker = false;

	$("#elapsed-button").prop("disabled", true);
	$("#topic").removeClass("btn-outline-primary").addClass("btn-light");
	$("#time-elapsed-"+selectedTopicID).prop("disabled", true);
	$("#stop-timer").hide();
	$("#start-timer").show();

	$('#is-active-modal-label').html("Are you still working on '" + topicsDictionary[selectedTopicID].name + "'?");
	$('#is-active-modal').modal();
}

function modalReject() {
	stopTimerUtils(timeElapsedAtAlert, timestampAtAlert);
}

function modalAccept() {
	$("#elapsed-button").prop("disabled", false);
	$("#topic").removeClass("btn-light").addClass("btn-outline-primary");s
	$("#time-elapsed-"+selectedTopicID).prop("disabled", false);
	$("#stop-timer").show();
	$("#start-timer").hide();

	shouldUpdateTicker = true;
	timeoutVar = setTimeout(checkIfActive, MODAL_TIME_CONSTANT);
}

function pushEvent(eventString) {
	eventsLogList.push("["+currTimeFormatted+"] "+eventString);
	renderEvents();
}

/* Sets the value of the topic alert */
function setTopicAlert(val) {
	$("#topic").html(val);
}

/* Adds new Topic to list */
function addNewTopic(topic) {
	if (topic != "") {
		console.log("Adding new task: " + topic);
		var topicId = Math.floor(100000 + Math.random() * 900000);
		topicsDictionary[topicId] = {id: topicId, name: topic, time: 0};

		if (selectedTopicID == "" || selectedTopicID == null || isWorkingOnTask == false) {
			selectedTopicID = topicId;
			storeSelectedTopicID();
		}
		storeTopics();
	}
}

function addNewNote(noteContent) {
	if (selectedTopicID != "" && selectedTopicID != null) {
		pushEvent(topicsDictionary[selectedTopicID].name+": "+noteContent);
	} else {
		pushEvent("No Topic: "+noteContent);
	}
	storeEvents();
}

function deleteTopic() {
	var topicId = $(this).parent().parent().attr("id").substring(4);
	if (selectedTopicID == topicId) {
		if (isWorkingOnTask) {
			if (shouldUpdateTicker) {
				stopTimer();
			} else {
				stopTimerUtils(timeElapsedAtAlert, timestampAtAlert);
			}
		}
		selectedTopicID = "";
	}
	console.log("Deleting topic: " + topicsDictionary[topicId]);
	delete topicsDictionary[topicId];
	storeTopics()
	renderTopics();
}

function editTopic() {
	var topicId = $(this).parent().parent().parent().attr("id").substring(4);
	$(this).parent().parent().find(".topicButton").hide();
	$(this).parent().parent().find("#more-actions").hide();
	$(this).parent().parent().find("#edit-topic-input").show();
}

function changeTopicName(element) {
	var topicId = element.parent().find(".topicButton").attr("id");
	var newName = element.val();

	pushEvent(`Renamed '${topicsDictionary[selectedTopicID].name}' to '${newName}'`)
	topicsDictionary[topicId].name = newName;

	storeTopics();
}

/* Selects a topic to be active (may be the current active topic) */
function selectTopic() {
	//Topic is different than existing active topic
	if (selectedTopicID != $(this).val()) {
		if (selectedTopicID != null && selectedTopicID != "") {
			stopTimer();
			unsetActiveTopic();
		}

		selectedTopicID = $(this).val();
		storeSelectedTopicID();

		setActiveTopic();
		startTimer();

		document.title = "Work Log - " + topicsDictionary[selectedTopicID].name;
	} else {
		toggleTimer(!isWorkingOnTask);
	}

	renderEvents();
	storeLocalStorage(eventsLogList, topicsDictionary, selectedTopicID);
}

function unsetActiveTopic() {
	$(`#${selectedTopicID}`).removeClass("btn-success").removeClass("btn-danger").addClass("btn-light");
}

function setActiveTopic() {
	var activeTopic = $(`#${selectedTopicID}`);
	activeTopic.removeClass("btn-light").removeClass("btn-danger").removeClass("btn-success");

	if (isWorkingOnTask) {
		activeTopic.addClass("btn-danger");
	} else {
		activeTopic.addClass("btn-success");
	}

	if (selectedTopicID != null && selectedTopicID != "") {
		setTopicAlert(topicsDictionary[selectedTopicID].name);
	}
}

function toggleTimer(state) {
	if (isWorkingOnTask && !state) {
		stopTimer();
	} else if (!isWorkingOnTask && state) {
		startTimer();
	}
}

function clearData() {
	console.log("Cleared Data");
	localStorage.clear();
	location.reload();
}

function saveData() {
	console.log("Saved Data to file");
	var new_events = eventsLogList.slice(0);

	if (isWorkingOnTask) {
		new_events.push(`[${currTimeFormatted}] Stopped working on '${topicsDictionary[selectedTopicID].name}'`);
	}
	var file_dump = {"events" : new_events, "topics" : topicsDictionary, "selectedTopicID": selectedTopicID}
	var blob = new Blob([JSON.stringify(file_dump, null, 2)], {type : 'application/json'});
	var url = window.URL.createObjectURL(blob);
	$("#file_download").html(url);
	$("#file_download").attr("href", url);
	$("#file_download").attr("download", "work_log_dump.json");
	$("#file_download")[0].click();
}

function importData(event) {
	var reader = new FileReader();
	var f = event.target.files[0];
    // Closure to capture the file information.
	reader.onloadend = (function(file) {
		return function(e) {

			var file_dump = JSON.parse(e.target.result);
			eventsLogList = file_dump.events;
			topicsDictionary = file_dump.topics;
			selectedTopicID = file_dump.selectedTopicID;

			storeLocalStorage(eventsLogList, topicsDictionary, selectedTopicID);
			render();

			var updateAlert = $("#alert-template").clone();
			$("#alerts").append(updateAlert);
			updateAlert.show();

			setTimeout(function() {
		        updateAlert.alert('close');
		    }, 10000);
		};
	})(f);

	// Read in the image file as text
	reader.readAsText(f);
}

function storeEvents() {
	storeLocalStorage(eventsLogList, "", "");
}

function storeTopics() {
	storeLocalStorage("", topicsDictionary, "");
}

function storeSelectedTopicID() {
	storeLocalStorage("", "", selectedTopicID);
}

function storeLocalStorage(eventsLogList="", topicsDictionary="", selectedTopicID="") {
	if (eventsLogList != null && eventsLogList != "") {
		localStorage.setItem("events", JSON.stringify(eventsLogList));
	}
	
	if (topicsDictionary != null && topicsDictionary != "") {
		localStorage.setItem("topics", JSON.stringify(topicsDictionary));
	}
	
	if (selectedTopicID != null && selectedTopicID != "") {
		localStorage.setItem("selectedTopicID", selectedTopicID);
	}
}