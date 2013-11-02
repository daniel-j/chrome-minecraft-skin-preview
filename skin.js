/*	Created by djazz
 *	http://djazz.mine.nu/
 *	@daniel_hede on Twitter
 *	daniel_hede in Minecraft
 *
 *	https://chrome.google.com/webstore/detail/abdidfhdgkoepjlnnnbmjahnlhbjgfgp
 */

(function (global, undefined) {
	'use strict';
	
	// shim layer with setTimeout fallback
	var requestAnimFrame = (function () {
		return window.requestAnimationFrame       || 
		       window.webkitRequestAnimationFrame || 
		       window.mozRequestAnimationFrame    || 
		       window.oRequestAnimationFrame      || 
		       window.msRequestAnimationFrame     || 
		       function(/* function */ callback, /* DOMElement */ element) {
		           window.setTimeout(callback, 1000 / 60);
		       };
	}());
	
	
	var supportWebGL = !!global.WebGLRenderingContext && (!!global.document.createElement('canvas').getContext('experimental-webgl') || !!global.document.createElement('canvas').getContext('webgl'));
	var havePointerLock = 'pointerLockElement' in document || 'webkitPointerLockElement' in document;
	var username = global.document.querySelector('div#userbox span.logged-in').firstChild.textContent;
	username = username.substring(13, username.length - 3);

	// User not premium
	if (!global.document.querySelector('#main form')) {
		return;
	}

	var userExist = true;
	
	var skinContainer = global.document.createElement('div');
	skinContainer.id = "MinecraftSkinPreviewContainer";
	skinContainer.classList.add('no-cape');
	
	global.document.querySelector('#main :first-child').insertBefore(skinContainer, global.document.querySelector('#main form'));
	
	
	skinContainer.appendChild(global.document.createElement('br'));
	
	var skintable = global.document.createElement('table');

	
	var skintr = skintable.insertRow(-1);
	var leftcol = skintr.insertCell(-1);
	var rightcol = skintr.insertCell(-1);
	leftcol.setAttribute('rowspan', supportWebGL?3:2);
	rightcol.setAttribute('colspan', supportWebGL?2:3);
	
	leftcol.style.verticalAlign = 'top';
	
	var skinsubtr = skintable.insertRow(-1);
	var leftsubcol = skinsubtr.insertCell(-1);
	var rightsubcol = skinsubtr.insertCell(-1);
	rightsubcol.style.textAlign = 'right';
	

	var bottomtr = skintable.insertRow(-1);
	var bottomrow = bottomtr.insertCell(-1);
	bottomrow.setAttribute('colspan', 2);
	
	rightsubcol.style.width = "1px";
	
	skinContainer.appendChild(skintable);
	
	var cw = 470, ch = 620;
	var tileUvWidth = 1/64;
	var tileUvHeight = 1/32;
	
	
	var skinBig = global.document.createElement('canvas');
	skinBig.id = "MinecraftSkinPreview2D";
	var sbc = skinBig.getContext('2d');
	var sizeRatio = 8;
	skinBig.width = 64*sizeRatio;
	skinBig.height = 32*sizeRatio;
	var skincanvas = global.document.createElement('canvas');
	var skinc = skincanvas.getContext('2d');
	skincanvas.width = 64;
	skincanvas.height = 32;
	var capecanvas = global.document.createElement('canvas');
	var capec = capecanvas.getContext('2d');
	capecanvas.width = 64;
	capecanvas.height = 32;
	var itemscanvas = global.document.createElement('canvas');
	var itemsc = itemscanvas.getContext('2d');
	itemscanvas.width = 256;
	itemscanvas.height = 256;
	var currentItem = null;
	var itemList = {
		"Iron sword": 16*4+2,
		"Iron shovel": 16*5+2,
		"Iron pickaxe": 16*6+2,
		"Iron axe": 16*7+2,

		"Diamond sword": 16*4+3,
		"Diamond shovel": 16*5+3,
		"Diamond pickaxe": 16*6+3,
		"Diamond axe": 16*7+3,

		/*"Bow": 16*1+5,
		"Flint and steel": 5,

		"Lava bucket": 16*4+12*/
	};
	
	var isRotating = true;
	var isPaused = false;
	var isYfreezed = false;
	var isFunnyRunning = false;
	var isHoldingItem = false;
	
	var getMaterial = function (img, trans) {
		var material = new THREE.MeshBasicMaterial({
			map: new THREE.Texture(
				img,
				new THREE.UVMapping(),
				THREE.ClampToEdgeWrapping,
				THREE.ClampToEdgeWrapping,
				THREE.NearestFilter,
				THREE.NearestFilter,
				(trans? THREE.RGBAFormat : THREE.RGBFormat)
			),
			transparent: trans
		});
		material.map.needsUpdate = true;
		material.map.flipY = false;

		if (trans) {
			material.side = THREE.DoubleSide;
		}

		return material;
	};
	var uvmap = function (mesh, face, x, y, w, h, rotateBy) {
		if(!rotateBy) rotateBy = 0;
		var uvs = (mesh.geometry || mesh).faceVertexUvs[0][face];
		var tileU = x;
		var tileV = y;
		
		uvs[ (0 + rotateBy) % 4 ].x = tileU * tileUvWidth;
		uvs[ (0 + rotateBy) % 4 ].y = tileV * tileUvHeight;

		uvs[ (1 + rotateBy) % 4 ].x = tileU * tileUvWidth;
		uvs[ (1 + rotateBy) % 4 ].y = tileV * tileUvHeight + h * tileUvHeight;

		uvs[ (2 + rotateBy) % 4 ].x = tileU * tileUvWidth + w * tileUvWidth;
		uvs[ (2 + rotateBy) % 4 ].y = tileV * tileUvHeight + h * tileUvHeight;

		uvs[ (3 + rotateBy) % 4 ].x = tileU * tileUvWidth + w * tileUvWidth;
		uvs[ (3 + rotateBy) % 4 ].y = tileV * tileUvHeight;
	};
	var cubeFromPlanes = function (size, mat) {
		var cube = new THREE.Object3D();
		var meshes = [];
		for(var i=0; i < 6; i++) {
			var mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
			mesh.doubleSided = true;
			cube.add(mesh);
			meshes.push(mesh);
		}
		// Front
		meshes[0].rotation.x = Math.PI/2;
		meshes[0].rotation.y = Math.PI/2;
		meshes[0].rotation.z = -Math.PI/2;
		meshes[0].position.x = size/2;
		
		// Back
		meshes[1].rotation.x = Math.PI/2;
		meshes[1].rotation.y = -Math.PI/2;
		meshes[1].rotation.z = Math.PI/2;
		meshes[1].position.x = -size/2;
		
		// Top
		meshes[2].rotation.x = -Math.PI/2;
		meshes[2].position.y = size/2;
		
		// Bottom
		meshes[3].rotation.x = -Math.PI/2;
		meshes[3].rotation.y = Math.PI;
		meshes[3].rotation.z = Math.PI;
		meshes[3].position.y = -size/2;
		
		// Left
		//meshes[4].rotation.x = Math.PI/2;
		meshes[4].position.z = size/2;
		
		// Right
		//meshes[5].rotation.x = -Math.PI/2;
		meshes[5].rotation.y = Math.PI;
		meshes[5].position.z = -size/2;

		return cube;
	};

	var itemsmeshes = [];
	var itemgeometries = [];

	function createItem (id) {

		function getSides (x, y) {
			var ix = Math.floor(id % 16)*16;
			var iy = Math.floor(id / 16)*16;
			
			var px = (x+1) < 16? imd[((x+1)+y*16)*4+3] : 0;
			var nx = (x-1) >= 0? imd[((x-1)+y*16)*4+3] : 0;
			var py = (y+1) < 16? imd[(x+(y-1)*16)*4+3] : 0;
			var ny = (y-1) >= 0? imd[(x+(y+1)*16)*4+3] : 0;
			
			return {
				px: !px, // Turns zero and undefined to true
				nx: !nx,
				py: !py,
				ny: !ny,
				pz: supportWebGL,
				nz: supportWebGL
			};
		};
		
		if(itemgeometries[id] === undefined) {
			var imgdata = itemsc.getImageData(Math.floor(id % 16)*16, Math.floor(id / 16)*16, 16, 16);
			var imd = imgdata.data;
			
			tileUvWidth = 1/256;
			tileUvHeight = 1/256;
			
			var geo = new THREE.Geometry();
			
			var isAllEmpty = true;
			
			for(var x=0; x < 16; x++) {
				for(var y=0; y < 16; y++) {
					if(imd[(x+y*16)*4+3] === 0) {
						continue;
					}
					isAllEmpty = false;
					
					var voxel = new THREE.CubeGeometry(1, 1, 1, 1, 1 , 1, undefined, getSides(x, y));
					for(var i=0; i < 6; i++) { // Fix color of voxel
						if(voxel.faceVertexUvs[0][i]) {
							uvmap(voxel, i, Math.floor(id % 16)*16+x, Math.floor(id / 16)*16+y, 1, 1);
						}
					}
					for(var i=0; i < 8; i++) { // Fix voxel's position
						if(voxel.vertices[i]) {
							voxel.vertices[i].x += x-7.5;
							voxel.vertices[i].y += -(y-7.5);
						}
					}
					
					THREE.GeometryUtils.merge(geo, voxel);
				}
			}
			if(!supportWebGL) {
				var sides = new THREE.CubeGeometry(16, 16, 1, 1, 1, 1, undefined, { px: false, nx: false, py: false, ny: false });
				uvmap(sides, 0, Math.floor(id % 16)*16, Math.floor(id / 16)*16, 16, 16);
				uvmap(sides, 1, Math.floor(id % 16)*16+16, Math.floor(id / 16)*16, -16, 16);
				THREE.GeometryUtils.merge(geo, sides);
			}
			
			
			itemgeometries[id] = geo;
		}
		else {
			var geo = itemgeometries[id];
		}
		
		var mesh = new THREE.Mesh( geo, itemsMaterial );
		
		return mesh;
	};
	
	
	var charMaterial = getMaterial(skincanvas, false);
	var charMaterialTrans = getMaterial(skincanvas, true);
	var capeMaterial = getMaterial(capecanvas, false);
	var itemsMaterial = getMaterial(itemscanvas, false);
	
	var camera = new THREE.PerspectiveCamera(35, cw / ch, 1, 1000);
	camera.position.z = 30;
	//camera.target.position.y = -2;
	var scene = new THREE.Scene();
	scene.add(camera);
	
	var headgroup = new THREE.Object3D();
	var upperbody = new THREE.Object3D();
	
	// Left leg
	var leftleggeo = new THREE.CubeGeometry(4, 12, 4);
	for(var i=0; i < 8; i+=1) {
		leftleggeo.vertices[i].y -= 6;
	}
	var leftleg = new THREE.Mesh(leftleggeo, charMaterial);
	leftleg.position.z = -2;
	leftleg.position.y = -6;
	uvmap(leftleg, 0, 8, 20, -4, 12);
	uvmap(leftleg, 1, 16, 20, -4, 12);
	uvmap(leftleg, 2, 4, 16, 4, 4, 3);
	//uvmap(leftleg, 3, 8, 20, 4, -4, 1);
	uvmap(leftleg, 3, 8, 16, 4, 4, 1);
	uvmap(leftleg, 4, 12, 20, -4, 12);
	uvmap(leftleg, 5, 4, 20, -4, 12);
	
	
	
	// Right leg
	var rightleggeo = new THREE.CubeGeometry(4, 12, 4);
	for(var i=0; i < 8; i+=1) {
		rightleggeo.vertices[i].y -= 6;
	}
	var rightleg = new THREE.Mesh(rightleggeo, charMaterial);
	rightleg.position.z = 2;
	rightleg.position.y = -6;
	uvmap(rightleg, 0, 4, 20, 4, 12);
	uvmap(rightleg, 1, 12, 20, 4, 12);
	uvmap(rightleg, 2, 8, 16, -4, 4, 3);
	uvmap(rightleg, 3, 12, 16, -4, 4, 1);//uvmap(rightleg, 3, 12, 20, -4, -4, 1);
	uvmap(rightleg, 4, 0, 20, 4, 12);
	uvmap(rightleg, 5, 8, 20, 4, 12);
	
	
	
	// Body
	var bodygeo = new THREE.CubeGeometry(4, 12, 8);
	var bodymesh = new THREE.Mesh(bodygeo, charMaterial);
	uvmap(bodymesh, 0, 20, 20, 8, 12);
	uvmap(bodymesh, 1, 32, 20, 8, 12);
	uvmap(bodymesh, 2, 20, 16, 8, 4, 1);
	uvmap(bodymesh, 3, 28, 16, 8, 4, 3);
	uvmap(bodymesh, 4, 16, 20, 4, 12);
	uvmap(bodymesh, 5, 28, 20, 4, 12);
	upperbody.add(bodymesh);
	
	
	// Left arm
	var leftarmgeo = new THREE.CubeGeometry(4, 12, 4);
	for(var i=0; i < 8; i+=1) {
		leftarmgeo.vertices[i].y -= 4;
	}
	var leftarm = new THREE.Mesh(leftarmgeo, charMaterial);
	leftarm.position.z = -6;
	leftarm.position.y = 4;
	leftarm.rotation.x = Math.PI/32;
	uvmap(leftarm, 0, 48, 20, -4, 12);
	uvmap(leftarm, 1, 56, 20, -4, 12);
	uvmap(leftarm, 2, 48, 16, -4, 4, 1);
	uvmap(leftarm, 3, 52, 20, -4, -4, 3); //facebottom
	//uvmap(leftarm, 3, 52, 16, -4, 4, 3);
	uvmap(leftarm, 4, 52, 20, -4, 12);
	uvmap(leftarm, 5, 44, 20, -4, 12);
	upperbody.add(leftarm);
	
	// Right arm
	var rightarmgeo = new THREE.CubeGeometry(4, 12, 4);
	for(var i=0; i < 8; i+=1) {
		rightarmgeo.vertices[i].y -= 4;
	}
	var rightarm = new THREE.Mesh(rightarmgeo, charMaterial);
	rightarm.position.z = 6;
	rightarm.position.y = 4;
	rightarm.rotation.x = -Math.PI/32;
	uvmap(rightarm, 0, 44, 20, 4, 12);
	uvmap(rightarm, 1, 52, 20, 4, 12);
	uvmap(rightarm, 2, 44, 16, 4, 4, 1);
	uvmap(rightarm, 3, 48, 20, 4, -4, 3); //facebottom
	//uvmap(rightarm, 3, 48, 16, 4, 4, 3);
	uvmap(rightarm, 4, 40, 20, 4, 12);
	uvmap(rightarm, 5, 48, 20, 4, 12);
	upperbody.add(rightarm);
	
	//Head
	var headgeo = new THREE.CubeGeometry(8, 8, 8);
	var headmesh = new THREE.Mesh(headgeo, charMaterial);
	headmesh.position.y = 2;
	uvmap(headmesh, 0, 8, 8, 8, 8);
	uvmap(headmesh, 1, 24, 8, 8, 8);
	
	uvmap(headmesh, 2, 8, 0, 8, 8, 1);
	uvmap(headmesh, 3, 16, 8, 8, -8, 3); // head bottom
	
	uvmap(headmesh, 4, 0, 8, 8, 8);
	uvmap(headmesh, 5, 16, 8, 8, 8);
	headgroup.add(headmesh);
	
	// Helmet/hat
	/*var helmetgeo = new THREE.CubeGeometry(9, 9, 9);
	var helmetmesh = new THREE.Mesh(helmetgeo, charMaterialTrans);
	helmetmesh.doubleSided = true;
	helmetmesh.position.y = 2;
	uvmap(helmetmesh, 0, 32+8, 8, 8, 8);
	uvmap(helmetmesh, 1, 32+24, 8, 8, 8);
	
	uvmap(helmetmesh, 2, 32+8, 0, 8, 8, 1);
	uvmap(helmetmesh, 3, 32+20, 0, 8, -8, 3);
	
	uvmap(helmetmesh, 4, 32+0, 8, 8, 8);
	uvmap(helmetmesh, 5, 32+16, 8, 8, 8);
	headgroup.add(helmetmesh);*/
	
	var helmet = cubeFromPlanes(9, charMaterialTrans);
	helmet.position.y = 2;
	uvmap(helmet.children[0], 0, 32+8, 8, 8, 8);
	uvmap(helmet.children[1], 0, 32+24, 8, 8, 8);
	uvmap(helmet.children[2], 0, 32+8, 0, 8, 8, 1);
	uvmap(helmet.children[3], 0, 32+16, 8, 8, -8, 3); // helmet bottom
	uvmap(helmet.children[4], 0, 32+0, 8, 8, 8);
	uvmap(helmet.children[5], 0, 32+16, 8, 8, 8);
	
	headgroup.add(helmet);
	
	var ears = new THREE.Object3D();
	
	var eargeo = new THREE.CubeGeometry(1, (9/8)*6, (9/8)*6);
	var leftear = new THREE.Mesh(eargeo, charMaterial);
	var rightear = new THREE.Mesh(eargeo, charMaterial);
	
	leftear.position.y = 2+(9/8)*5;
	rightear.position.y = 2+(9/8)*5;
	leftear.position.z = -(9/8)*5;
	rightear.position.z = (9/8)*5;
	
	// Right ear share same geometry, same uv-maps
	
	uvmap(leftear, 0, 25, 1, 6, 6); // Front side
	uvmap(leftear, 1, 32, 1, 6, 6); // Back side
	
	uvmap(leftear, 2, 25, 0, 6, 1, 1); // Top edge
	uvmap(leftear, 3, 31, 0, 6, 1, 1); // Bottom edge
	
	uvmap(leftear, 4, 24, 1, 1, 6); // Left edge
	uvmap(leftear, 5, 31, 1, 1, 6); // Right edge
	
	ears.add(leftear);
	ears.add(rightear);
	
	leftear.visible = rightear.visible = false;
	
	headgroup.add(ears);
	headgroup.position.y = 8;
	
	var capeOrigo = new THREE.Object3D();
	var capegeo = new THREE.CubeGeometry(1, 16, 10);
	var capemesh = new THREE.Mesh(capegeo, capeMaterial);
	capemesh.position.y = -8;
	capemesh.visible = false;
	
	uvmap(capemesh, 0, 1, 1, 10, 16); // Front side
	uvmap(capemesh, 1, 12, 1, 10, 16); // Back side
	
	uvmap(capemesh, 2, 1, 0, 10, 1); // Top edge
	uvmap(capemesh, 3, 11, 0, 10, 1, 1); // Bottom edge
	
	uvmap(capemesh, 4, 0, 1, 1, 16); // Left edge
	uvmap(capemesh, 5, 11, 1, 1, 16); // Right edge
	
	
	capeOrigo.rotation.y = Math.PI;
	
	capeOrigo.position.x = -2;
	capeOrigo.position.y = 6;
	
	capeOrigo.add(capemesh);
	
	
	var playerModel = new THREE.Object3D();
	
	playerModel.add(leftleg);
	playerModel.add(rightleg);
	
	playerModel.add(upperbody);
	playerModel.add(headgroup);
	
	playerModel.add(capeOrigo);
	
	playerModel.position.y = username === 'deadmau5' ? 6 : 8;
	
	
	var playerGroup = new THREE.Object3D();
	
	playerGroup.add(playerModel);
	scene.add(playerGroup);
	
	
	
	
	var mouseX = 0;
	var mouseY = 0.1;
	var originMouseX = 0;
	var originMouseY = 0;
	var virtualMouseX = 0;
	var virtualMouseY = 0;
	
	var rad = 0;
	
	var isMouseOver = false;
	var isMouseDown = false;
	
	var counter = 0;
	var firstRender = true;
	
	var startTime = Date.now();
	var pausedTime = 0;
	
	/**
		// Taken from http://www.planetminecraft.com/forums/new-skin-previewer-t70674.html
		// Might be helpful sometime
		
		ModelBiped.prototype.setRotationAngles = function (b, c, R, Z, v) {
			var _ = 0.067,
				Y = 0.09,
				U = 0.05;
			this.rotatehead ? (this.bipedHead.rotateAngleY = 1 * Math.sin(0.23 * (R / 3)), this.bipedHead.rotateAngleX = 0.8 * Math.sin(0.1 * (R / 3))) : (this.bipedHead.rotateAngleY = Z / (180 / Math.PI), this.bipedHead.rotateAngleX = v / (180 / Math.PI));
			this.bipedHeadwear.rotateAngleY = this.bipedHead.rotateAngleY;
			this.bipedHeadwear.rotateAngleX = this.bipedHead.rotateAngleX;
			!this.isSneak && !this.isRiding && this.oldwalking ? (this.bipedRightArm.rotateAngleX = 2 * Math.cos(0.6662 * b + Math.PI) * c, this.bipedLeftArm.rotateAngleX = 2 * Math.cos(0.6662 * b) * c, this.bipedLeftArm.rotateAngleZ = 1 * (Math.cos(0.2812 * b) - 1) * c, this.bipedRightArm.rotateAngleZ = 1 * (Math.cos(0.2312 * b) + 1) * c) : (this.bipedRightArm.rotateAngleX = I * 2 * Math.cos(0.6662 * b + Math.PI) * c, this.bipedLeftArm.rotateAngleX = I * 2 * Math.cos(0.6662 * b) * c, this.bipedLeftArm.rotateAngleZ = 0, this.bipedRightArm.rotateAngleZ = 0);
			this.bipedRightLeg.rotateAngleX = 1.4 * Math.cos(0.6662 * b) * c;
			this.bipedLeftLeg.rotateAngleX = 1.4 * Math.cos(0.6662 * b + Math.PI) * c;
			this.bipedRightLeg.rotateAngleY = 0;
			this.bipedLeftLeg.rotateAngleY = 0;
			this.isRiding && (this.bipedRightArm.rotateAngleX += -(Math.PI / 5), this.bipedLeftArm.rotateAngleX += -(Math.PI / 5), this.bipedRightLeg.rotateAngleX = -(2 * Math.PI / 5), this.bipedLeftLeg.rotateAngleX = -(2 * Math.PI / 5), this.bipedRightLeg.rotateAngleY = Math.PI / 10, this.bipedLeftLeg.rotateAngleY = -(Math.PI / 10));
			0 != this.heldItemLeft && !this.oldwalking && (this.bipedLeftArm.rotateAngleX = I * this.bipedLeftArm.rotateAngleX - Math.PI / 10 * this.heldItemLeft);
			0 != this.heldItemRight && !this.oldwalking && (this.bipedRightArm.rotateAngleX = I * this.bipedRightArm.rotateAngleX - Math.PI / 10 * this.heldItemRight);
			this.bipedRightArm.rotateAngleY = 0;
			this.bipedLeftArm.rotateAngleY = 0; - 9990 < this.onGround && !this.oldwalking && (b = this.onGround, this.bipedBody.rotateAngleY = 0.2 * Math.sin(2 * Math.sqrt(b) * Math.PI), this.bipedRightArm.rotationPointZ = 5 * Math.sin(this.bipedBody.rotateAngleY), this.bipedRightArm.rotationPointX = 5 * -Math.cos(this.bipedBody.rotateAngleY), this.bipedLeftArm.rotationPointZ = 5 * -Math.sin(this.bipedBody.rotateAngleY), this.bipedLeftArm.rotationPointX = 5 * Math.cos(this.bipedBody.rotateAngleY), this.bipedRightArm.rotateAngleY += this.bipedBody.rotateAngleY, this.bipedLeftArm.rotateAngleY += this.bipedBody.rotateAngleY, this.bipedLeftArm.rotateAngleX += this.bipedBody.rotateAngleY, b = 1 - this.onGround, b *= b, b = Math.sin((1 - b * b) * Math.PI), c = 0.75 * Math.sin(this.onGround * Math.PI) * -(this.bipedHead.rotateAngleX - 0.7), this.bipedRightArm.rotateAngleX -= 1.2 * b + c, this.bipedRightArm.rotateAngleY += 2 * this.bipedBody.rotateAngleY, this.bipedRightArm.rotateAngleZ = -0.4 * Math.sin(this.onGround * Math.PI));
			this.isSneak ? (this.bipedBody.rotateAngleX = I, this.bipedRightLeg.rotateAngleX -= 0, this.bipedLeftLeg.rotateAngleX -= 0, this.bipedRightArm.rotateAngleX += 0.4, this.bipedLeftArm.rotateAngleX += 0.4, this.bipedRightLeg.rotationPointZ = 4, this.bipedLeftLeg.rotationPointZ = 4, this.bipedRightLeg.rotationPointY = 9, this.bipedLeftLeg.rotationPointY = 9, this.bipedHead.rotationPointY = 1) : (this.bipedBody.rotateAngleX = 0, this.bipedRightLeg.rotationPointZ = 0, this.bipedLeftLeg.rotationPointZ = 0, this.bipedRightLeg.rotationPointY = 12, this.bipedLeftLeg.rotationPointY = 12, this.bipedHead.rotationPointY = 0);
			this.bipedHeadwear.rotationPointY = this.bipedHead.rotationPointY;
			this.bipedRightArm.rotateAngleZ += U * Math.cos(Y * R) + U;
			this.bipedLeftArm.rotateAngleZ -= U * Math.cos(Y * R) + U;
			this.bipedRightArm.rotateAngleX += U * Math.sin(_ * R);
			this.bipedLeftArm.rotateAngleX -= U * Math.sin(_ * R);
			this.aimedBow && (this.bipedRightArm.rotateAngleZ = 0, this.bipedLeftArm.rotateAngleZ = 0, this.bipedRightArm.rotateAngleY = -0.1 + this.bipedHead.rotateAngleY, this.bipedLeftArm.rotateAngleY = 0.1 + this.bipedHead.rotateAngleY + 0.4, this.bipedRightArm.rotateAngleX = -(Math.PI / 2) + this.bipedHead.rotateAngleX, this.bipedLeftArm.rotateAngleX = -(Math.PI / 2) + this.bipedHead.rotateAngleX, this.bipedRightArm.rotateAngleX -= 0, this.bipedLeftArm.rotateAngleX -= 0, this.bipedRightArm.rotateAngleZ += U * Math.cos(Y * R) + U, this.bipedLeftArm.rotateAngleZ -= U * Math.cos(Y * R) + U, this.bipedRightArm.rotateAngleX += U * Math.sin(_ * R), this.bipedLeftArm.rotateAngleX -= U * Math.sin(_ * R));
		};
	/**/
	
	var camDistance = 65;

	var render = function () {
		requestAnimFrame(render, renderer.domElement);
		var oldRad = rad;
		
		var time = (Date.now() - startTime)/1000;
		
		if(!isMouseDown) {
			//mouseX*=0.95;
			if(!isYfreezed) {
				mouseY*=0.97;
			}
			if(isRotating) {
				rad += 2;
			}
		}
		else {
			rad = mouseX;
		}
		if(mouseY > 500) {
			mouseY = 500;
		}
		else if(mouseY < -500) {
			mouseY = -500;
		}
		camera.position.x = -Math.cos(rad/(cw/2)+(Math.PI/0.9));
		camera.position.z = -Math.sin(rad/(cw/2)+(Math.PI/0.9));
		camera.position.y = (mouseY/(ch/2))*1.5+0.2;
		camera.position.setLength(camDistance);
		camera.lookAt(new THREE.Vector3(0, 1.5, 0));
		
		
		if(!isPaused) {
			counter+=0.01;
			headgroup.rotation.y = Math.sin(time*1.5)/5;
			headgroup.rotation.z = Math.sin(time)/6;
			
			if(isFunnyRunning) {
				
				rightarm.rotation.z = 2 * Math.cos(0.6662 * time*10 + Math.PI);
				rightarm.rotation.x = 1 * (Math.cos(0.2812 * time*10) - 1);
				leftarm.rotation.z = 2 * Math.cos(0.6662 * time*10);
				leftarm.rotation.x = 1 * (Math.cos(0.2312 * time*10) + 1);
				
				rightleg.rotation.z = 1.4 * Math.cos(0.6662 * time*10);
				leftleg.rotation.z = 1.4 * Math.cos(0.6662 * time*10 + Math.PI);
				
				playerGroup.position.y = -6+1 * Math.cos(0.6662 * time*10 * 2); // Jumping
				playerGroup.position.z = 0.15 * Math.cos(0.6662 * time*10); // Dodging when running
				playerGroup.rotation.x = 0.01 * Math.cos(0.6662 * time*10 + Math.PI); // Slightly tilting when running
				
				capeOrigo.rotation.z = 0.1 * Math.sin(0.6662 * time*10 * 2)+Math.PI/2.5;
			
			}
			else {
				leftarm.rotation.z = -Math.sin(time*3)/2;
				leftarm.rotation.x = (Math.cos(time*3)+Math.PI/2)/30;
				if (isHoldingItem && false) {
					rightarm.rotation.z = Math.sin(time*3)/8+Math.PI/7;
				} else {
					rightarm.rotation.z = Math.sin(time*3)/2;
					
				}
				rightarm.rotation.x = -(Math.cos(time*3)+Math.PI/2)/30;
			
				leftleg.rotation.z = Math.sin(time*3)/3;
				rightleg.rotation.z = -Math.sin(time*3)/3;
				capeOrigo.rotation.z = Math.sin(time*2)/15+Math.PI/15;
				
				playerGroup.position.y = -6; // Not jumping
			}
			
		}
		
		renderer.render(scene, camera);
	}

	if(supportWebGL) {
		var renderer = new THREE.WebGLRenderer({antialias: false, preserveDrawingBuffer: true});
		var threecanvas = renderer.domElement;
		threecanvas.id = "MinecraftSkinPreviewRenderer";
		//renderer.sortObjects = false;
		renderer.setSize(cw, ch);
		renderer.setClearColorHex(0x000000, 0.0);

		render();

		var skinlegend = global.document.createElement('div');
		skinlegend.innerHTML = "Drag character to rotate";
		leftcol.appendChild(skinlegend);

		leftcol.appendChild(threecanvas);

		if (havePointerLock) {
			threecanvas.requestPointerLock = threecanvas.requestPointerLock || threecanvas.webkitRequestPointerLock;
			document.exitPointerLock = document.exitPointerLock || document.webkitExitPointerLock;
			/*document.addEventListener('pointerlockchange', pointerLockChange, false);
			document.addEventListener('webkitpointerlockchange', pointerLockChange, false);*/
		}

		var onMouseMove = function (e) {
			if(isMouseDown) {
				if (false && havePointerLock && (e.movementX !== undefined || e.webkitMovementX !== undefined)) {
					virtualMouseX += e.movementX || e.webkitMovementX || 0;
					virtualMouseY += e.movementY || e.webkitMovementY || 0;
					mouseX = virtualMouseX;
					mouseY = virtualMouseY;
				} else {
					mouseX = (e.pageX - threecanvas.offsetLeft - originMouseX);
					mouseY = (e.pageY - threecanvas.offsetTop - originMouseY);
				}
			}
		}

		threecanvas.addEventListener('mousedown', function (e) {
			if(e.which !== 1) return;
			e.preventDefault();
			originMouseX = (e.pageX - threecanvas.offsetLeft) - rad;
			originMouseY = (e.pageY - threecanvas.offsetTop) - mouseY;
			virtualMouseX = 0;
			virtualMouseY = 0;
			isMouseDown = true;
			isMouseOver = true;
			if (havePointerLock) {
				//threecanvas.requestPointerLock();
			}
			onMouseMove(e);
		}, false);
		global.addEventListener('mouseup', function (e) {
			if(e.which !== 1) return;
			isMouseDown = false;
			if (havePointerLock) {
				//document.exitPointerLock();
			}
		}, false);
		global.addEventListener('mousemove', onMouseMove, false);
		threecanvas.addEventListener('mouseout', function (e) {
			isMouseOver = false;
		}, false);
		threecanvas.addEventListener('mousewheel', function (e) {
			e.preventDefault();
			if (e.wheelDelta > 0) {
			    camDistance -= 2.5;
			}
			else if (e.wheelDelta < 0){
				camDistance += 2.5;
			}
			camDistance = Math.min(Math.max(camDistance, 10), 90)
		}, false);

	}
	else {
		//var renderer = new THREE.CanvasRenderer({antialias: false, preserveDrawingBuffer: true});

		var noWebGL = global.document.createElement('div');
		noWebGL.innerHTML = "<strong>Warning:</strong> No 3D <a href=\"http://en.wikipedia.org/wiki/WebGL\" target=\"_blank\">WebGL</a> drawing context available, falling back to 2D only.";
		noWebGL.style.fontStyle = 'italic';
		noWebGL.style.fontSize = '13px';
		leftcol.appendChild(noWebGL);
	}

	var skinFile = global.document.createElement('input');
	skinFile.type = 'file';
	skinFile.accept = "image/png"; // Only png images
	var skinToken = global.document.querySelector('#main form input[name="authenticityToken"]');
	
	skinFile.addEventListener('change', function () {
		var fr = new FileReader();
		fr.addEventListener('load', function (e) {
			userExist = true;
			useThisBtn.disabled = false;
			skin.src = fr.result;
			loadCape(username);
			leftear.visible = rightear.visible = username === 'deadmau5';
			
			skinFile.value = null;
		}, false);
		fr.readAsDataURL(skinFile.files[0]);
	});
	
	
	var dlSkin = global.document.createElement('a');
	dlSkin.href = 'http://s3.amazonaws.com/MinecraftSkins/'+username+'.png?timestamp='+(new Date().getTime());
	dlSkin.target = "_blank";
	
	dlSkin.download = username+".png";
	dlSkin.innerHTML = "Download your current skin";
	rightcol.appendChild(dlSkin);	
	rightcol.appendChild(global.document.createElement('br'));
	
	rightcol.appendChild(skinBig);


	var otherUserForm = global.document.createElement('form');
	var otherUsername = global.document.createElement('input');
	otherUsername.type = 'text';
	otherUsername.placeholder = 'Preview by username';
	
	otherUserForm.appendChild(otherUsername);
	

	/*var fixUsernameForm = function () {
		otherUserSubmit.disabled = isUploading || otherUsername.value.length === 0
	};*/
	
	/*otherUsername.addEventListener('input', function () {
		fixUsernameForm();
	}, false);*/
	otherUserForm.addEventListener('submit', function (e) {
		e.preventDefault();
		if(otherUsername.value.length > 0) {
			loadSkin(otherUsername.value, true /* skin only */);
		}
	}, false);

	
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
			arr[i] = raw.charCodeAt(i);
		}
		return arr.buffer;
	};

	var dataURIToBlob = function (dataURI, mimetype) {
		var raw = dataURIToString(dataURI);
		var ab = stringToArrayBuffer(raw);
		
		// Old blob code
		/*var bb = new (global.BlobBuilder || global.WebKitBlobBuilder)();
		bb.append(arr.buffer);
		return bb.getBlob(mimetype);*/

		return new Blob([new Uint8Array(ab)], {type: mimetype});
	};
	
	var isUploading = false;
	var useThisBtn = global.document.createElement('button');
	useThisBtn.textContent = 'Use this as my skin';
	var useThisOldText = useThisBtn.textContent;

	useThisBtn.addEventListener('click', function () {
		useThisBtn.disabled = skinFile.disabled = /*otherUsername.disabled = otherUserSubmit.disabled =*/ resetSkinBtn.disabled = fakeSkinBtn.disabled = true;
		useThisBtn.textContent = 'Uploading...';
		isUploading = true;
		//fixUsernameForm();
		var skinBlob = dataURIToBlob(skincanvas.toDataURL('image/png'), 'image/png');
		var x = new XMLHttpRequest();
		x.responseType = "document"; 
		x.open('post', '/profile/skin', true);
		var fd = new FormData();
		fd.append('skin', skinBlob);
		fd.append('authenticityToken', skinToken.value);
		
		x.addEventListener('load', function (e) {
			skinFile.disabled = /*otherUsername.disabled =*/ resetSkinBtn.disabled = fakeSkinBtn.disabled = false;
			isUploading = false;
			//fixUsernameForm();
			if(x.status === 200) { // Upload successful
				
				var statusp = x.response.querySelector("#main :first-child > h1 + p");
				var errorspan = x.response.querySelector("#main :first-child form span.error");
				var newToken = x.response.querySelector("input[name=authenticityToken]");
				if (statusp && statusp.className === 'success') {
					useThisBtn.innerHTML = 'Success';
					loadSkin(username);
					console.log("New token:", newToken.value);
					skinToken.value = newToken.value;
				} else if(errorspan && errorspan.textContent !== '') {
					useThisBtn.textContent = "Error uploading";
					alert(errorspan.textContent);
				} else {
					useThisBtn.textContent = "Unknown error";
				}
				
			}
			else {
				useThisBtn.textContent = "Error uploading";
			}

			setTimeout(function () {
				useThisBtn.textContent = useThisOldText;
				useThisBtn.disabled = false;
			}, 1000);
		}, false);
		x.send(fd);
		
	}, false);
	
	
	
	var fakeSkinBtn = global.document.createElement('button');
	fakeSkinBtn.id = "fakeSkinBtn";
	fakeSkinBtn.textContent = "Load skin from file";
	fakeSkinBtn.appendChild(skinFile); // Add file input to button

	
	var resetSkinBtn = global.document.createElement('button');
	resetSkinBtn.textContent = "Reload current skin";


	resetSkinBtn.addEventListener('click', function (e) {
		loadSkin(username);
		e.preventDefault();
	}, false);

	var saveSkinBtn = document.createElement('button');
	saveSkinBtn.type = 'button';
	saveSkinBtn.textContent = 'Save to collection';
	saveSkinBtn.addEventListener('click', function (e) {
		saveSkinBtn.disabled = true;
		var dataURI = skincanvas.toDataURL('image/png');
		
		var checksum = hex_md5(dataURI);
		if (slotChecksums.indexOf(checksum) !== -1) {
			return;
		}
		var skinData = dataURIToString(dataURI);
		addSkinToStorage(username, skinData, function (filename) {
			addSlot(filename);
		});
	}, false);


	var feedbackLink = document.createElement('a');
	feedbackLink.href = "mailto:"+"djazz.mine.nu" +"@gma"+ "il.com?Subject="+encodeURIComponent("Feedback for Minecraft Skin Preview");
	feedbackLink.textContent = "Send me feedback";
	feedbackLink.style.paddingTop = "5px";

	var cell = supportWebGL? rightsubcol : leftcol;
	if (!supportWebGL) {
		cell.appendChild(global.document.createElement('br'));
		cell.appendChild(global.document.createElement('br'));
		cell.style.paddingRight = "10px";
	}
	cell.appendChild(otherUserForm);
	cell.appendChild(useThisBtn);
	cell.appendChild(fakeSkinBtn);
	cell.appendChild(resetSkinBtn);
	cell.appendChild(saveSkinBtn);
	cell.appendChild(feedbackLink);
	
	// Left sub column

	if (supportWebGL) {
		
		var screenshotBtn = document.createElement('button');
		screenshotBtn.setAttribute('type', 'button');
		screenshotBtn.textContent = 'Screenshot';
		screenshotBtn.addEventListener('click', function () {
			window.open(renderer.domElement.toDataURL('image/png'), '_blank', 'width='+renderer.domElement.width+',height='+renderer.domElement.height);
		}, false);
		leftsubcol.appendChild(screenshotBtn);

		var itemPicker = document.createElement('select');
		itemPicker.addEventListener('change', function (e) {
			var id = +itemPicker.value;
			
			useItem(id);
			
		}, false);
		var noItem = new Option("No item selected", -1);
		itemPicker.appendChild(noItem);
		for (var i in itemList) {
			var option = new Option(i, itemList[i]);
			itemPicker.appendChild(option);
		}
		leftsubcol.appendChild(itemPicker);

		leftsubcol.appendChild(global.document.createElement('br'));

		var spinBox = global.document.createElement('input');
		spinBox.type = 'checkbox';
		spinBox.checked = false;
		spinBox.id = 'msp_spinbox';
		var spinBoxLabel = global.document.createElement('label');
		spinBoxLabel.textContent = "Freeze rotating";
		spinBoxLabel.setAttribute('for', spinBox.id);
		leftsubcol.appendChild(spinBox);
		leftsubcol.appendChild(spinBoxLabel);
		
		spinBox.addEventListener('change', function () {
			isRotating = !spinBox.checked;
		}, false);
		
		leftsubcol.appendChild(global.document.createElement('br'));
		
		var yFreezeBox = global.document.createElement('input');
		yFreezeBox.type = 'checkbox';
		yFreezeBox.checked = false;
		yFreezeBox.id = 'msp_yfreezebox';
		var yFreezeBoxLabel = global.document.createElement('label');
		yFreezeBoxLabel.textContent = "Freeze camera";
		yFreezeBoxLabel.setAttribute('for', yFreezeBox.id);
		leftsubcol.appendChild(yFreezeBox);
		leftsubcol.appendChild(yFreezeBoxLabel);
		
		yFreezeBox.addEventListener('change', function () {
			isYfreezed = yFreezeBox.checked;
		}, false);
		
		leftsubcol.appendChild(global.document.createElement('br'));

		var moveBox = global.document.createElement('input');
		moveBox.type = 'checkbox';
		moveBox.checked = false;
		moveBox.id = 'msp_movebox';
		var moveBoxLabel = global.document.createElement('label');
		moveBoxLabel.textContent = "Freeze movements";
		moveBoxLabel.setAttribute('for', moveBox.id);
		leftsubcol.appendChild(moveBox);
		leftsubcol.appendChild(moveBoxLabel);
		
		moveBox.addEventListener('change', function () {
			isPaused = moveBox.checked;
			// \o/
			if(isPaused) {
				pausedTime = Date.now() - startTime;
			}
			else {
				startTime = Date.now() - pausedTime;
			}
		}, false);
		
		leftsubcol.appendChild(global.document.createElement('br'));
		
		var runBox = global.document.createElement('input');
		runBox.type = 'checkbox';
		runBox.checked = false;
		runBox.id = 'msp_runbox';
		var runBoxLabel = global.document.createElement('label');
		runBoxLabel.textContent = "Classic running";
		runBoxLabel.setAttribute('for', runBox.id);
		leftsubcol.appendChild(runBox);
		leftsubcol.appendChild(runBoxLabel);
		leftsubcol.appendChild(global.document.createElement('br'));
		runBox.addEventListener('change', function () {
			isFunnyRunning = runBox.checked;
		}, false);


		var capeBox = global.document.createElement('input');
		capeBox.type = 'checkbox';
		capeBox.checked = true;
		capeBox.id = 'msp_capebox';
		capeBox.classList.add('cape-only');
		var capeBoxLabel = global.document.createElement('label');
		capeBoxLabel.textContent = "Show capes";
		capeBoxLabel.setAttribute('for', capeBox.id);
		capeBoxLabel.classList.add('cape-only');
		leftsubcol.appendChild(capeBox);
		leftsubcol.appendChild(capeBoxLabel);
		capeBox.addEventListener('change', function () {
			if(capeBox.checked) {
				capeOrigo.add(capemesh);
			}
			else {
				capeOrigo.remove(capemesh);
			}
		}, false);
		var capeBr = global.document.createElement('br');
		capeBr.classList.add('cape-only');
		leftsubcol.appendChild(capeBr);
		
	}
	
	


	var numSlots = 50;
	var slots = [];
	var slotNodes = [];
	var slotChecksums = [];
	var slotContainer = document.createElement('div');
	slotContainer.classList.add('slotContainer');
	bottomrow.appendChild(slotContainer);
	var slotCanvas = document.createElement('canvas');
	slotCanvas.width = 64;
	slotCanvas.height = 32;
	var slotc = slotCanvas.getContext('2d');

	var slotControls = document.createElement('div');
	slotControls.classList.add('controls');

	var slotRemove = document.createElement('div');
	slotRemove.classList.add('remove');
	slotRemove.textContent = 'x';
	slotRemove.setAttribute('title', 'Remove from collection');

	function slotClickUse (e) {
		var index = slotNodes.indexOf(this.parentNode);
		var slot = slots[index];
		if (slot && slot.isActive) {
			skin.src = slots[index].img.src;
		}
	};
	function slotClickRemove (e) {
		var index = slotNodes.indexOf(this.parentNode.parentNode);
		var slot = slots[index];
		if (slot && slot.isActive) {
			slot.btnRemove.parentNode.removeChild(slot.btnRemove);
			removeSkinFromStorage(username, slot.filename, function (success) {
				var checksum = hex_md5(skincanvas.toDataURL('image/png'));
				saveSkinBtn.disabled = slotChecksums.indexOf(checksum) !== -1;

				slot.isActive = false;
				slot.node.style.webkitTransform = "scale(2, 2)";
				slot.node.style.transform = "scale(2, 2)";
				slot.node.style.opacity = 0.0;
				slot.node.style.width = '0px';
				setTimeout(function () {
					slotContainer.removeChild(slot.node);
				}, 150);
				
				
			});
			slots.splice(index, 1);
			slotNodes.splice(index, 1);
			slotChecksums.splice(index, 1);
		}

	};
	
	var prependChild = function (parent, child) {
		if (parent.firstChild) {
			parent.insertBefore(child, parent.firstChild);
		} else {
			parent.appendChild(child);
		}
	};
	
	function addSlot (filename) {
		
		var slot = {};
		slot.isActive = false;
		slot.node = document.createElement('div');
		slot.node.classList.add('slot');

		slot.controls  = slotControls.cloneNode(false);
		slot.btnRemove = slotRemove.cloneNode(true);
		slot.controls.appendChild(slot.btnRemove);
		slot.node.appendChild(slot.controls);

		slot.filename = filename;
		slot.img = document.createElement('img');
		slot.img.setAttribute('title', 'Preview this skin');
		
		slot.node.addEventListener('mousedown', function (e) {e.preventDefault();}, false);
		slot.btnRemove.addEventListener('click', slotClickRemove, false);
		slot.img.addEventListener('click', slotClickUse, false);
		
		
		getSkinFromStorage(username, filename, function (dataURI) {
			var checksum = hex_md5(dataURI);
			/*if (slotChecksums.indexOf(checksum) !== -1) {
				return;
			}*/

			slot.img.src = dataURI;
			slot.node.appendChild(slot.img);
			slot.isActive = true;
			

			
			slots.unshift(slot);
			slotNodes.unshift(slot.node);
			slotChecksums.unshift(checksum);

			prependChild(slotContainer, slot.node);
			
			setTimeout(function () {
				slot.node.style.width = "64px";
				slot.node.style.webkitTransform = "scale(1, 1)";
				slot.node.style.transform = "scale(1, 1)";
			}, 0);
		});

	};

	var storageInfoDiv = document.createElement('div');
	storageInfoDiv.classList.add('storageInfo');
	bottomrow.appendChild(storageInfoDiv);

	var clearStorageLink = document.createElement('a');
	clearStorageLink.href = "javascript:";
	clearStorageLink.textContent = "Empty collection";
	clearStorageLink.addEventListener('click', function (e) {
		e.preventDefault();
		if (confirm("Are you sure you want to remove all stored skins?")) {
			clearSkinStorage(username, function (success) {
				if (success) {
					for (var i = 0; i < slots.length; i++) {
						var slot = slots[i];
						slotContainer.removeChild(slotNodes[i]);
					}
					slots = [];
					slotNodes = [];
					slotChecksums = [];
					saveSkinBtn.disabled = false;
				}
			});
		}
	}, false);
	bottomrow.appendChild(clearStorageLink);
	


	function handleDragEnter (e) {
		if (this === e.target) {
			this.classList.add('drop');
		} else {
			this.classList.remove('drop');
		}
		e.preventDefault();
		
	};
	function handleDragLeave (e) {
		e.preventDefault();
		this.classList.remove('drop');
	};

	function currentSkinDrop (e) {
		e.preventDefault();
		this.classList.remove('drop');

		var files = e.dataTransfer.files;
		if (files.length >= 1) {
			var file = files[0];
			var type = file.type.split('/');
			if (type[0] === 'image') {
				var fr = new FileReader();
				fr.onload = function () {
					skin.src = fr.result;
				};
				fr.readAsDataURL(file);
			}
		}
	};

	skinBig.addEventListener("dragenter", handleDragEnter, false);
	skinBig.addEventListener("dragleave", handleDragLeave, false);
	skinBig.addEventListener("dragover", handleDragEnter, false); // Notice listener function
	skinBig.addEventListener('drop', currentSkinDrop, false);

	if (supportWebGL) {

		threecanvas.addEventListener("dragenter", handleDragEnter, false);
		threecanvas.addEventListener("dragleave", handleDragLeave, false);
		threecanvas.addEventListener("dragover", handleDragEnter, false);
		threecanvas.addEventListener('drop', currentSkinDrop, false);
	}


	slotContainer.addEventListener("dragenter", handleDragEnter, false);
	slotContainer.addEventListener("dragleave", handleDragLeave, false);
	slotContainer.addEventListener("dragover", handleDragEnter, false);
	slotContainer.addEventListener('drop', function (e) {
		e.preventDefault();
		slotContainer.classList.remove('drop');

	
		var files = e.dataTransfer.files;
		for (var i = 0; i < files.length; i++) {
			var file = files[i];
			var type = file.type.split('/');
			if (type[0] === 'image') {
				var fr = new FileReader();
				fr.onload = function () {
					var img = document.createElement('img');
					img.onload = function () {
						drawFixedSkin(slotc, img);
						var dataURI = slotCanvas.toDataURL('image/png');
						var checksum = hex_md5(dataURI);
						if (slotChecksums.indexOf(checksum) !== -1) {
							return;
						}
						var skinData = dataURIToString(dataURI);
						
						addSkinToStorage(username, skinData, function (filename) {
							addSlot(filename);
						});
					};
					img.src = this.result;
				};
				fr.readAsDataURL(file);
			}
		}
	}, false);


	function drawFixedSkin (ctx, img) {

		ctx.clearRect(0, 0, 64, 32);
		
		ctx.drawImage(img, 0, 0);
		
		var imgdata = ctx.getImageData(0, 0, 64, 32);
		var pixels = imgdata.data;
		
		var isOnecolor = true;
		
		var colorCheckAgainst = [40, 0];
		var colorIndex = (colorCheckAgainst[0]+colorCheckAgainst[1]*64)*4;
		
		var isPixelDifferent = function (x, y) {
			if(pixels[(x+y*64)*4+0] !== pixels[colorIndex+0] || pixels[(x+y*64)*4+1] !== pixels[colorIndex+1] || pixels[(x+y*64)*4+2] !== pixels[colorIndex+2] || pixels[(x+y*64)*4+3] !== pixels[colorIndex+3]) {
				return true;
			}
			return false;
		};
		
		// Check if helmet/hat is a solid color
		// Bottom row
		for(var i=32; i < 64; i+=1) {
			for(var j=8; j < 16; j+=1) {
				if(isPixelDifferent(i, j)) {
					isOnecolor = false;
					break;
				}
			}
			if(!isOnecolor) {
				break;
			}
		}
		if(!isOnecolor) {
			// Top row
			for(var i=40; i < 56; i+=1) {
				for(var j=0; j < 8; j+=1) {
					if(isPixelDifferent(i, j)) {
						isOnecolor = false;
						break;
					}
				}
				if(!isOnecolor) {
					break;
				}
				
			}
		}
		
		for(var i=0; i < 64; i+=1) {
			for(var j=0; j < 32; j+=1) {
				
				if(isOnecolor && ((i >= 32 && i < 64 && j >= 8 && j < 16) || (i >= 40 && i < 56 && j >= 0 && j < 8))) {
					pixels[(i+j*64)*4+3] = 0;
				}
				/*else if(userExist) {
					//pixels[(i+j*64)*4+3] = 255;
				}*/
				
			}
		}
		
		
		ctx.putImageData(imgdata, 0, 0);

		return pixels;
	};
	
	var skin = document.createElement('img');
	
	skin.onload = function () {
		if(skin.width !== 64 || skin.height !== 32) {
			//alert('Warning! Skin have wrong size');
		}

		var pixels = drawFixedSkin(skinc, skin);

		var dataURI = skincanvas.toDataURL('image/png');
		var checksum = hex_md5(dataURI);
		saveSkinBtn.disabled = slotChecksums.indexOf(checksum) !== -1;
		
		sbc.clearRect(0, 0, skinBig.width, skinBig.height);
		sbc.save();
		for(var i=0; i < 64; i+=1) {
			for(var j=0; j < 32; j+=1) {
				sbc.fillStyle = 'rgba('+pixels[(i+j*64)*4+0]+', '+pixels[(i+j*64)*4+1]+', '+pixels[(i+j*64)*4+2]+', '+pixels[(i+j*64)*4+3]/255+')';
				sbc.fillRect(i*sizeRatio, j*sizeRatio, sizeRatio, sizeRatio);
			}
		}
		sbc.restore();
		
		if(!userExist) {
			//skinc.clearRect(0, 0, 64, 32);
			//saveSkinBtn.disabled = true;
		}
		charMaterial.map.needsUpdate = true;
		charMaterialTrans.map.needsUpdate = true;
	};
	
	var cape = document.createElement('img');
	
	cape.onload = function () {
		
		capec.clearRect(0, 0, 64, 32);
		
		capec.drawImage(cape, 0, 0);
		
		/*var imgdata = capec.getImageData(0, 0, 64, 32);
		var pixels = imgdata.data;
		
		var transcolors = [
			[0, 0, 0],
			[255, 255, 255]
		];
		
		for(var i=0; i < 64; i+=1) {
			for(var j=0; j < 32; j+=1) {
				for(var k=0; k < transcolors.length; k++) {
					if(pixels[(i+j*64)*4+0] === transcolors[k][0] && pixels[(i+j*64)*4+1] === transcolors[k][1] && pixels[(i+j*64)*4+2] === transcolors[k][2]) {
						pixels[(i+j*64)*4+3] = 0;
					}
				}
			}
		}
		
		capec.putImageData(imgdata, 0, 0);*/
		
		/*if(!userExist) {
			capec.clearRect(0, 0, 64, 32);
		}*/
		
		capeMaterial.map.needsUpdate = true;
		capemesh.visible = true;
	};

	var items = document.createElement('img');

	items.onload = function () {
		itemsc.clearRect(0, 0, itemscanvas.width, itemscanvas.height);
		itemsc.drawImage(items, 0, 0);
		itemsMaterial.map.needsUpdate = true;
		
	};
	
	var loadSkin = function (usr, skinOnly) {
		chrome.extension.sendRequest({type: 'lookup', username: usr, skin: true, cape: false}, function (response) {
			
			if (!skinOnly) {
				leftear.visible = rightear.visible = usr === 'deadmau5';
			}
			
			
			if(response.ok) {
				userExist = true;
				
			}
			else {
				userExist = false;
				
			}
			skin.src = response.skin;

			
			//useThisBtn.disabled = (!response.ok) || isUploading;
		});
		if (!skinOnly) {
			loadCape(usr);
		}
		
	};
	
	var loadCape = function (usr) {
		chrome.extension.sendRequest({type: 'lookup', username: usr, skin: false, cape: true}, function (response) {
			
			
			
			if(response.cape) {
				cape.src = response.cape;
				skinContainer.classList.remove('no-cape');
			} else {
				skinContainer.classList.add('no-cape');
			}
			capemesh.visible = !!response.cape;
			
		});
	};
	
	loadSkin(username);

	var loadItems = function () {
		chrome.extension.sendRequest({type: 'image', url: 'items.png'}, function (response) {
			items.src = response;
		});
	};
	loadItems();
	var useItem = function (id) {

		if (currentItem) {
			if (currentItem.id === id) {
				return;
			}
			
			rightarm.remove(currentItem);
			
			
		}

		if (id !== -1) {

			var item = createItem(id);

			item.id = id;
			item.position.x = 6;
			item.position.y = -8.5;
			item.rotation.z = -Math.PI/4;
			item.rotation.x = Math.PI;

			//scene.remove(playerGroup);
			//renderer.clear();
			//scene.add(playerGroup);
			rightarm.add(item);
			

			currentItem = item;
			

		} else {
			currentItem = null;
		}
		
		isHoldingItem = !!currentItem;
		
	};
	

	// http://codeaid.net/javascript/convert-size-in-bytes-to-human-readable-format-(javascript)
	function bytesToSize (bytes, precision) {
		var sizes = ['Bytes', 'kB', 'MB', 'GB', 'TB'];
		var posttxt = 0;
		if (bytes === 1) sizes[0] = 'Byte';
		while( bytes >= 1024 ) {
			posttxt++;
			bytes = bytes / 1024;
		}
		return bytes.toFixed(precision) + " " + sizes[posttxt];
	};
	var updateStorageInfo = function (callback) {
		chrome.extension.sendRequest({type: 'storage', info: true}, function (response) {
			var used = response.used;
			storageInfoDiv.textContent = "Used storage: " + bytesToSize(used, 2);
		});
	};
	var updateSkinStorageList = function (usr) {
		chrome.extension.sendRequest({type: 'storage', username: usr}, function (response) {
			for (var i = 0; i < response.length; i++) {
				addSlot(response[i].filename);
			}
		});
	};
	var addSkinToStorage = function (usr, data, callback) {
		chrome.extension.sendRequest({type: 'storage', username: usr, data: data}, function (response) {
			updateStorageInfo();
			callback(response.filename);
		});
	};
	var getSkinFromStorage = function (usr, filename, callback) {
		chrome.extension.sendRequest({type: 'storage', username: usr, filename: filename}, function (response) {

			callback(response);
		});
	};
	var removeSkinFromStorage = function (usr, filename, callback) {
		chrome.extension.sendRequest({type: 'storage', username: usr, filename: filename, remove: true}, function (response) {
			updateStorageInfo();
			callback(response);
		});
	};
	var clearSkinStorage = function (usr, callback) {
		chrome.extension.sendRequest({type: 'storage', clear: true}, function (response) {
			updateStorageInfo();
			callback(response);
		});
	};
	updateSkinStorageList(username);
	updateStorageInfo();
	
}(this));
