var attenuationFactor = 4.0;
var volumeFactor = 1.0;

function sendMessage(name, params) {
	return fetch('https://' + GetParentResourceName() + '/' + name, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(params)
	});
}

function getPlayer(handle, create) {
	var id = 'player_' + handle.toString(16);

	var player = document.getElementById(id);

	if (!player && create) {
		player = document.createElement('audio');
		player.id = id;
		document.body.appendChild(player);
	}

	return player;
}

function parseTimecode(timecode) {
	if (timecode.includes(':')) {
		var a = timecode.split(':');
		return parseInt(a[0]) * 3600 + parseInt(a[1]) * 60 + parseInt(a[2]);
	} else {
		return parseInt(timecode);
	}
}

function init(handle, url, volume, offset) {
	offset = parseTimecode(offset);

	sendMessage('init', {
		handle: handle,
		url: url,
		volume: volume,
		startTime: Math.floor(Date.now() / 1000 - offset)
	});
}

function play(handle) {
	getPlayer(handle, true).currentTime = 0;
}

function pause(handle) {
	sendMessage('pause', {
		handle: handle,
		paused: Math.floor(Date.now() / 1000)
	});
}

function stop(handle) {
	var player = getPlayer(handle, false);

	if (player) {
		player.remove();
	}
}

function setAttenuationFactor(target) {
	if (attenuationFactor > target) {
		attenuationFactor -= 0.1;
	} else {
		attenuationFactor += 0.1;
	}
}

function setVolumeFactor(target) {
	if (volumeFactor > target) {
		volumeFactor -= 0.1;
	} else {
		volumeFactor += 0.1;
	}
}

function update(handle, url, baseVolume, startTime, paused, distance, sameRoom) {
	var player = getPlayer(handle, false);

	if (player) {
		if (paused) {
			if (!player.paused) {
				player.pause();
			}
		} else {
			if (sameRoom) {
				setAttenuationFactor(4.0);
				setVolumeFactor(1.0);
			} else {
				setAttenuationFactor(6.0);
				setVolumeFactor(4.0);
			}

			if (player.src != url) {
				player.src = url;
			}

			if (player.readyState > 0) {
				var volume = ((baseVolume - distance * attenuationFactor) / 100) / volumeFactor;
				var currentTime = (Math.floor(Date.now() / 1000) - startTime) % player.duration;

				if (Math.abs(currentTime - player.currentTime) > 2) {
					player.currentTime = currentTime;
				}

				if (volume > 0) {
					player.volume = volume;

					if (player.paused) {
						player.play();
					}
				} else {
					if (!player.paused) {
						player.pause();
					}
				}
			}
		}
	}
}

function timeToString(time) {
	var h = Math.floor(time / 60 / 60);
	var m = Math.floor(time / 60) % 60;
	var s = Math.floor(time) % 60;

	return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function updateUi(data) {
	var activePhonographs = JSON.parse(data.activePhonographs);

	var activePhonographsDiv = document.getElementById('active-phonographs');

	activePhonographsDiv.innerHTML = '';

	Object.keys(activePhonographs).forEach(key => {
		var handle = parseInt(key);
		var player = getPlayer(handle, false);

		if (player) {
			var div = document.createElement('div');
			div.className = 'active-phonograph';

			var handleDiv = document.createElement('div');
			handleDiv.className = 'active-phonograph-handle';
			handleDiv.innerHTML = handle.toString(16);

			var urlDiv = document.createElement('div');
			urlDiv.className = 'active-phonograph-url';
			urlDiv.innerHTML = activePhonographs[key].url;

			var volumeDiv = document.createElement('div');
			volumeDiv.className = 'active-phonograph-volume';
			volumeDiv.innerHTML = '<i class="fa fa-volume-up"></i> ' + activePhonographs[key].volume;

			var timeDiv = document.createElement('div');
			timeDiv.className = 'active-phonograph-time';
			if (player.duration && player.duration != Infinity) {
				timeDiv.innerHTML = '<i class="fa fa-clock-o"></i> ' + timeToString(player.currentTime) + '/' + timeToString(player.duration);
			} else {
				timeDiv.innerHTML = '<i class="fa fa-clock-o"></i> ' + timeToString(player.currentTime);
			}

			var pauseResumeButton = document.createElement('button');
			if (activePhonographs[handle].paused) {
				pauseResumeButton.innerHTML = '<i class="fa fa-play"></i>';
			} else {
				pauseResumeButton.innerHTML = '<i class="fa fa-pause"></i>';
			}
			pauseResumeButton.addEventListener('click', event => {
				pause(handle);
			});

			var stopButton = document.createElement('button');
			stopButton.innerHTML = '<i class="fa fa-stop"></i>';
			stopButton.addEventListener('click', event => {
				sendMessage('stop', {
					handle: handle
				});
			});

			div.appendChild(handleDiv);
			div.appendChild(urlDiv);
			div.appendChild(volumeDiv);
			div.appendChild(timeDiv);
			div.appendChild(pauseResumeButton);
			div.appendChild(stopButton);

			activePhonographsDiv.appendChild(div);
		}
	});

	var inactivePhonographs = JSON.parse(data.inactivePhonographs);

	var inactivePhonographsSelect = document.getElementById('inactive-phonographs');
	var urlInput = document.getElementById('url');
	var volumeInput = document.getElementById('volume');
	var offsetInput = document.getElementById('offset');
	var playButton = document.getElementById('play-button');

	inactivePhonographsSelect.innerHTML = '';

	if (inactivePhonographs.length == 0) {
		inactivePhonographsSelect.disabled = true;
		urlInput.disabled = true;
		volumeInput.disabled = true;
		offsetInput.disabled = true;
		playButton.disabled = true;
		urlInput.value = '';
		urlInput.placeholder = 'No inactive phonographs';
	} else {
		var value = inactivePhonographsSelect.value;

		inactivePhonographs.forEach(phonograph => {
			var option = document.createElement('option');

			option.value = phonograph.handle;
			option.innerHTML = phonograph.handle.toString(16) + ' (' + Math.floor(phonograph.distance) + 'm)';

			if (phonograph.handle == value) {
				option.selected = true;
			}

			inactivePhonographsSelect.appendChild(option);
		});

		inactivePhonographsSelect.disabled = false;
		urlInput.disabled = false;
		volumeInput.disabled = false;
		offsetInput.disabled = false;
		playButton.disabled = false;

		urlInput.placeholder = 'Enter URL...';
	}
}

function showUi() {
	document.getElementById('ui').style.display = 'flex';
}

function hideUi() {
	document.getElementById('ui').style.display = 'none';
}

function startPhonograph() {
	var handleInput = document.getElementById('inactive-phonographs');
	var urlInput = document.getElementById('url');
	var volumeInput = document.getElementById('volume');
	var offsetInput = document.getElementById('offset');

	var handle = parseInt(handleInput.value);
	var url = urlInput.value;
	var volume = parseInt(volumeInput.value);
	var offset = offsetInput.value;

	if (!volume) {
		volume = 100;
	}

	if (!offset) {
		offset = '0';
	}

	sendMessage('play', {
		handle: handle,
		url: url,
		volume: volume,
		offset: offset
	});

	urlInput.value = '';
	volumeInput.value = 100;
	offsetInput.value = '00:00:00';
}

function showStatus(handle, startTime) {
	var timecode;

	if (startTime) {
		timecode = timeToString(Math.floor(Date.now() / 1000) - startTime);
	} else {
		timecode = '0'
	}

	sendMessage('status', {
		handle: handle,
		timecode: timecode
	});
}

window.addEventListener('message', event => {
	switch (event.data.type) {
		case 'init':
			init(event.data.handle, event.data.url, event.data.volume, event.data.offset);
			break;
		case 'play':
			play(event.data.handle);
			break;
		case 'pause':
			pause(event.data.handle);
			break;
		case 'stop':
			stop(event.data.handle);
			break;
		case 'status':
			showStatus(event.data.handle, event.data.startTime);
			break;
		case 'update':
			update(event.data.handle, event.data.url, event.data.volume, event.data.startTime, event.data.paused, event.data.distance, event.data.sameRoom);
			break;
		case 'showUi':
			showUi();
			break;
		case 'hideUi':
			hideUi();
			break;
		case 'updateUi':
			updateUi(event.data);
			break;
	}
});

window.addEventListener('load', () => {
	document.getElementById('close-ui').addEventListener('click', function(event) {
		hideUi();
		sendMessage('closeUi', {});
	});

	document.getElementById('play-button').addEventListener('click', function(event) {
		startPhonograph();
	});

	document.getElementById('start-phonograph').addEventListener('keyup', function(event) {
		if (event.keyCode == 13) {
			event.preventDefault();
			startPhonograph();
		}
	});
});