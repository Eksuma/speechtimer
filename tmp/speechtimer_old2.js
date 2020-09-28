(function() {
"use strict";

//
// variables
//

const countdownLen = document.querySelector('#countdownLength');
const reporting = document.querySelector('#tellInterval');
const select = document.querySelector('#voiceType');
const volume = document.querySelector('#voiceVolume');
const rate = document.querySelector('#voiceRate');
const pitch = document.querySelector('#voicePitch');

const timeSign = document.querySelector("#minussign");
const hundredthsValue = document.querySelector('#hundredths');
const secondsValue = document.querySelector('#seconds');
const minutesValue = document.querySelector('#minutes');
// const hoursValue = document.querySelector('#hours');

const settingsButton = document.querySelector('#toggleSettings');
const startButton = document.querySelector('#startButton');
const resetButton = document.querySelector('#resetButton');

const timestamp = ((performance && performance.now) ? performance.now.bind(performance) : Date.now.bind(Date));
// const timestamp = () => performance.now() / 10; // debug

const updateInterval = 50; // in milliseconds

//
// actual variables
//

var startTime = 0;
var elapsedTime = 0;
var timeBeforePause = 0;
var prevSecsElapsed = 0;

var intervalId = 0;
var mainFunction = beginCountdown;

//
// functions
//

function checkSupport()
{
	if (!'speechSynthesis' in window)
	{
		const header = document.createElement('h3');

		header.className = "error";
		header.textContent = "No speech synthesis support! :(";

		document.querySelector('body').insertBefore(header, document.querySelector('#digits'));

		return false;
	}

	return true;
}

function populateVoiceList()
{
	var voices = speechSynthesis.getVoices();

	// clear list first
	while (select.firstChild)
		select.removeChild(select.firstChild);

	if (voices.length == 0)
	{
		// assume one option...
		var option1 = document.createElement('option');
		option1.value = 0;
		option1.textContent = "Voice 1";
		select.appendChild(option1);

		return;
	}

	for (var i = 0; i < voices.length; i++)
	{
		var option = document.createElement('option');

		option.value = i;
		option.textContent = voices[i].name;

		select.appendChild(option);
	}
}

// callback: (ev) => console.log('Finished in ' + Math.round(ev.elapsedTime) + ' ms.');

var numSpeakCalls = 0;

function speak(text, callback)
{
	console.log("speak " + (++numSpeakCalls) + ": " + text);

	if (speechSynthesis.speaking)
		speechSynthesis.cancel();

	var voices = speechSynthesis.getVoices();

	var msg = new SpeechSynthesisUtterance();
	var selectedOption = select.selectedOptions[0];

	msg.voice = voices[selectedOption.value]; // Note: some voices don't support altering params

	msg.voiceURI = 'native';
	msg.volume = volume.value; // 0 to 1
	msg.rate = rate.value;     // 0.1 to 10
	msg.pitch = pitch.value;   // 0 to 2
	msg.text = text;
	msg.lang = 'en-US';

	if (callback)
		msg.onend = callback;

	speechSynthesis.speak(msg);
}

function beginCountdown()
{
	const countdownChoice = countdownLen.selectedOptions[0];
	const afterSeconds = parseInt(countdownChoice.value, 10);

	startTimer(afterSeconds * 1000); // to milliseconds
}

function changeMainButton(text, func, color)
{
	startButton.innerHTML = text;
	mainFunction = func;
	startButton.style.backgroundColor = color;
}

function startTimer(startDelay = 0)
{
	clearInterval(intervalId);
	startTime = timestamp() + startDelay;
	intervalId = setInterval(updateTimer, updateInterval);

	changeMainButton('Pause', pauseTimer, "red");
}

function updateTimer()
{
	const currentTime = timestamp();

	elapsedTime = timeBeforePause + (currentTime - startTime);

	updateDigits();
}

function resetTimer()
{
	clearInterval(intervalId);
	intervalId = 0;

	elapsedTime = 0;
	prevSecsElapsed = 0;
	timeBeforePause = 0;

	updateDigits();

	changeMainButton('Start', beginCountdown, "green");
}

function pauseTimer()
{
	clearInterval(intervalId);
	intervalId = 0;

	timeBeforePause = elapsedTime;

	changeMainButton('Resume', startTimer, "green");
}

function toggleSettings()
{
	const settingsDiv = document.querySelector('#settings');

	settingsButton.classList.toggle("change");
	settingsDiv.classList.toggle("showIt");
}

// hacky hack hack
function updateDigits()
{
	const absElapsedTime = Math.abs(elapsedTime);
	const secondsElapsed = Math.floor(elapsedTime / 1000);
	const absSecondsElapsed = Math.abs((elapsedTime / 1000) | 0); // different from floor!

	//
	// set sign if time is negative
	//

	// on reset
	if (secondsElapsed === 0 && prevSecsElapsed === 0)
		timeSign.style.visibility = "hidden";

	// starting negative
	if (secondsElapsed < 0 && prevSecsElapsed >= 0)
		timeSign.style.visibility = "visible";

	// crossing to positive
	if (secondsElapsed >= 0 && prevSecsElapsed < 0)
		timeSign.style.visibility = "hidden";

	//
	// set digits
	//

	const cents = Math.floor((absElapsedTime / 10) % 100);
	const secs = Math.floor(absSecondsElapsed % 60);
	const mins = Math.floor(absSecondsElapsed / 60) % 60;
	// const hours = Math.floor(absSecondsElapsed / 3600);

	const padlead = num => num.toString().padStart(2, '0');

	hundredthsValue.textContent = padlead(cents);
	secondsValue.textContent = padlead(secs);
	minutesValue.textContent = padlead(mins);
	// hoursValue.textContent = padlead(hours);

	//
	// tell time
	//

	const reportChoice = reporting.selectedOptions[0];
	const reportInterval = parseInt(reportChoice.value, 10);

	if (reportInterval)
	{
		// special cases during countdown
		if (secondsElapsed <= 0)
		{
			if (prevSecsElapsed !== secondsElapsed)
			{
				// 3, 2, 1
				if (secondsElapsed >= -3 && secondsElapsed <= -1)
					speak((-secondsElapsed).toString());

				// 0
				if (secondsElapsed === 0)
					speak("go");
			}
		}
		else // normal timer
		{
			const prevInt = Math.floor(prevSecsElapsed / reportInterval);
			const currInt = Math.floor(secondsElapsed / reportInterval);

			if (prevInt !== currInt)
			{
				var str = "";

				if (mins > 0)
					str += mins + ((mins === 1) ? " minute " : " minutes ");

				if (secs > 0)
					str += secs + ((secs === 1) ? " second" : " seconds");

				speak(str);
			}
		}
	}

	prevSecsElapsed = secondsElapsed;
}

function setAllListeners()
{
	const volumeNum = document.querySelector('#volumeNumber');
	const rateNum = document.querySelector('#rateNumber');
	const pitchNum = document.querySelector('#pitchNumber');

	const updateNum = (num, src) => num.textContent = parseFloat(src.value).toFixed(2);

	volume.oninput = () => updateNum(volumeNum, volume);
	rate.oninput = () => updateNum(rateNum, rate);
	pitch.oninput = () => updateNum(pitchNum, pitch);

	volume.oninput();
	rate.oninput();
	pitch.oninput();

	startButton.addEventListener('click', () => mainFunction());
	resetButton.addEventListener('click', resetTimer);
	settingsButton.addEventListener('click', toggleSettings);

	if (speechSynthesis.onvoiceschanged !== undefined)
		speechSynthesis.onvoiceschanged = populateVoiceList;
}

//
// main
//

if (!checkSupport())
	return;

populateVoiceList();
setAllListeners();

})();
