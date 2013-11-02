'use strict';

var dataURIToString = function (dataURI) {
	var BASE64_MARKER = ';base64,';
	var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
	var base64 = dataURI.substring(base64Index);
	return window.atob(base64);
};

var stringToArrayBuffer = function (raw) {
	var rawLength = raw.length; 
	var arr = new Uint8Array(rawLength);
	for (var i = 0; i < rawLength; ++i) {
		arr[i] = raw.charCodeAt(i) & 0xFF;
	}
	return arr.buffer;
};

var stringToBlob = function (str, mimetype) {
	var ab = stringToArrayBuffer(str);
	return new Blob([new Uint8Array(ab)], {type: mimetype});
};


var skincanvas = document.createElement('canvas');
var skinc = skincanvas.getContext('2d');
skincanvas.width = 64;
skincanvas.height = 32;

var capecanvas = document.createElement('canvas');
var capec = capecanvas.getContext('2d');
capecanvas.width = 64;
capecanvas.height = 32;

var defaultSkin = document.createElement('canvas');
var defskinc = defaultSkin.getContext('2d');
defaultSkin.width = 64;
defaultSkin.height = 32;

var defcapeurl = capecanvas.toDataURL();
var defskinurl = defaultSkin.toDataURL();

var defaultSkinImg = new Image();
defaultSkinImg.onload = function () {
	defskinc.drawImage(defaultSkinImg, 0, 0);
	defskinurl = defaultSkin.toDataURL();
};
defaultSkinImg.src = chrome.extension.getURL("char.png");


function fsError (e) {
	var msg = '';

	switch (e.code) {
		case FileError.QUOTA_EXCEEDED_ERR:
			msg = 'QUOTA_EXCEEDED_ERR';
			break;
		case FileError.NOT_FOUND_ERR:
			msg = 'NOT_FOUND_ERR';
			break;
		case FileError.SECURITY_ERR:
			msg = 'SECURITY_ERR';
			break;
		case FileError.INVALID_MODIFICATION_ERR:
			msg = 'INVALID_MODIFICATION_ERR';
			break;
		case FileError.INVALID_STATE_ERR:
			msg = 'INVALID_STATE_ERR';
			break;
		default:
			msg = 'Unknown Error';
			break;
	};

	console.error('FileSystem Error: ' + msg);
}

var rFS  = window.requestFileSystem || window.webkitRequestFileSystem;
var storageInfo = window.webkitStorageInfo || window.storageInfo;

var fs = null;
var skinDir = null;
rFS(PERSISTENT, 0, function (_fs) {
	fs = _fs;
	fs.root.getDirectory('skins', {create: true}, function (dirEntrySkins) {
		skinDir = dirEntrySkins;
	}, fsError);
}, fsError);

function getUsedStorage (cb) {
	storageInfo.queryUsageAndQuota(PERSISTENT, function (used, remaining) {
		cb(used, remaining);
	}, function (e) {
		console.log('StorageInfo error:', e);
		cb(0, 0);
	});
};


chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
	
	if (request.type === 'lookup') {
		var username = request.username;
		var loadskin = !!request.skin;
		var loadcape = !!request.cape;
		
		var skinLoaded = !loadskin;
		var capeLoaded = !loadcape;
		
		var capeurl = '';
		var skinurl = defskinurl;
		var ok = false;
		
		var allLoaded = function () {
			sendResponse({
				skin: skinurl,
				cape: capeurl,
				ok: ok
			});
		};
		
		if(loadskin) {
			var skin = new Image();
			skin.onload = function () {
				//console.log('Loading skin for '+username);
				skinc.clearRect(0, 0, skincanvas.width, skincanvas.height);
				skinc.drawImage(this, 0, 0);
				ok = true;
				skinurl = skincanvas.toDataURL();
				skinLoaded = true;
				if(capeLoaded) {
					allLoaded();
				}
			};
			skin.onerror = function () {
				ok = false;
				skinLoaded = true;
				if(capeLoaded) {
					allLoaded();
				}
			};
			skin.src = 'https://s3.amazonaws.com/MinecraftSkins/'+username+'.png?timestamp='+(new Date().getTime());
		}

		if(loadcape) {
			var cape = new Image();
			cape.onload = function () {
				capec.clearRect(0, 0, capecanvas.width, capecanvas.height);
				capec.drawImage(this, 0, 0);
				capeurl = capecanvas.toDataURL();
				
				capeLoaded = true;
				if(skinLoaded) {
					allLoaded();
				}
			};
			cape.onerror = function () {
				capeLoaded = true;
				if(skinLoaded) {
					allLoaded();
				}
			};
			cape.src = 'https://s3.amazonaws.com/MinecraftCloaks/'+username+'.png?timestamp='+(new Date().getTime());
			
		}


	} else if (request.type === 'storage' && skinDir) {
		
		if (request.info !== undefined) {
			
			getUsedStorage(function (used, remaining) {
				sendResponse({used: used, remaining: remaining});
			});
			
		} else if (request.filename !== undefined) {
			if (request.remove !== undefined) {
				skinDir.getDirectory(request.username, {create: false}, function (dirEntryUser) {
					dirEntryUser.getFile(request.filename, {create: false}, function (fileEntry) {
						fileEntry.remove(function () {
							sendResponse(true);
						}, function () {
							sendResponse(false);
						});
					}, function () {
						sendResponse(false);
					});
				}, fsError);
			} else {
				skinDir.getDirectory(request.username, {create: false}, function (dirEntryUser) {
					dirEntryUser.getFile(request.filename, {create: false}, function (fileEntry) {
						fileEntry.file(function (file) {

							var fr = new FileReader();
							fr.onload = function () {
								sendResponse(fr.result);
							};
							fr.readAsDataURL(file);

						}, fsError);
					}, fsError);
				}, fsError);
			}
		} else if (request.data !== undefined) {
			
			var blob = stringToBlob(request.data, 'image/png');
			

			skinDir.getDirectory(request.username, {create: true}, function (dirEntryUser) {
				dirEntryUser.getFile(Date.now()+'.png', {create: true}, function (fileEntry) {
					fileEntry.createWriter(function (fileWriter) {

						fileWriter.onwriteend = function (e) {
							
							sendResponse({
								//url: fileEntry.toURL(),
								//path: fileEntry.fullPath,
								filename: fileEntry.name
							});
						};

						fileWriter.write(blob);

					}, fsError);
				}, fsError);
			}, fsError);
		} else if(request.clear !== undefined) {
			skinDir.getDirectory(request.username, {create: false}, function (dirEntryUser) {
				dirEntryUser.removeRecursively(function () {
					fs.root.getDirectory('skins', {create: true}, function (dirEntrySkins) {
						skinDir = dirEntrySkins;
						sendResponse(true);
					}, fsError);
					
				}, function () {
					sendResponse(false);
				});
			}, fsError);
		} else {
			skinDir.getDirectory(request.username, {create: false}, function (dirEntryUser) {
				dirEntryUser.createReader().readEntries(function (files) {
					var list = [];
					for (var i = 0; i < files.length; i++) {
						list.push({
							//url: files[i].toURL(),
							//path: files[i].fullPath,
							filename: files[i].name
						});
					}
					list.sort(function (a, b) {
						var A = a.filename;
						var B = b.filename;
						if (A < B) {
							return -1;
						} else if (A > B) {
							return 1;
						} else {
							return 0;
						}
					});
					sendResponse(list);
				}, fsError);
			}, fsError);
		}

	} else if (request.type === 'image') {
		var canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;
		var ctx = canvas.getContext('2d');
		var items = new Image();
		items.onload = function () {
			ctx.drawImage(items, 0, 0);
			sendResponse(canvas.toDataURL('image/png'));
		};
		items.src = request.url;
	}
	
});


