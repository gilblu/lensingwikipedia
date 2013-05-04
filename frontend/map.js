var mapClipId = 0;
var mapSphereId = 0;

var mapProjections = {
	hobodyer: {
		name: "Flat",
		longName: "Hobo-Dyer",
		moveType: 'pan',
		initialScaleFactor: 0.20,
		scaleFactorChange: 0.3,
		panMode: 'translate',
		proj: function() {
			return d3.geo.cylindricalEqualArea()
				.parallel(37.5);
		}
	},
	orthographic: {
		name: "Globe",
		longName: "Orthographic",
		moveType: 'origin',
		initialScaleFactor: 0.30,
		scaleFactorChange: 0.3,
		panMode: 'rotate',
		proj: function() {
			return d3.geo.orthographic()
				.clipAngle(90);
		}
	},
	waterman: {
		name: "Butterfly",
		longName: "Waterman Butterfly",
		initialScaleFactor: 0.20,
		scaleFactorChange: 0.3,
		panMode: 'translate',
		proj: function() {
			return d3.geo.polyhedron.waterman()
				.rotate([20, 0]);
		}
	}
}

function drawWorld(svg, group, worldData, projection) {
	// This is all from d3's Waterman Butterfly example

	var path = d3.geo.path()
		.projection(projection);

	var graticule = d3.geo.graticule()
		.extent([[-180, -90], [180, 90]]);

	var sphereId = "mapsphere" + mapSphereId;
	mapSphereId++;
	svg.append("defs").append("path")
		.datum({type: "Sphere"})
		.attr("id", sphereId)
		.attr("d", path);

	var clipId = "mapclip" + mapClipId;
	mapClipId++;
	svg.append("clipPath")
		.attr("id", clipId)
		.append("use")
		.attr("xlink:href", "#" + sphereId);

	group.append("use")
		.attr("class", "map background")
		.attr("xlink:href", "#" + sphereId);
	group.append("use")
		.attr("class", "map foreground")
		.attr("xlink:href", "#" + sphereId);

	group.insert("path", ".graticule")
		.datum(topojson.object(worldData, worldData.objects.land))
		.attr("clip-path", "url(#" + clipId + ")")
		.attr("class", "map land")
		.attr("d", path);
	group.insert("path", "map .graticule")
		.datum(topojson.object(worldData, worldData.objects.lakes))
		.attr("clip-path", "url(#" + clipId + ")")
		.attr("class", "map lake")
		.attr("d", path);
	group.insert("path", ".graticule")
		.datum(topojson.object(worldData, worldData.objects.rivers))
		.attr("clip-path", "url(#" + clipId + ")")
		.attr("class", "map river")
		.attr("d", path);
	group.append("g")
		.attr("class", "map graticule")
		.attr("clip-path", "url(#" + clipId + ")")
		.selectAll("path")
		.data(graticule.lines)
		.enter().append("path")
		.attr("d", path);
	group.insert("path", ".graticule")
		.datum(topojson.mesh(worldData, worldData.objects.countries, function(a, b) { return a !== b; }))
		.attr("clip-path", "url(#" + clipId + ")")
		.attr("class", "map currentcountryboundary")
		.attr("d", path);

	return path;
}

function drawClusters(svg, group, proj, clusters, initialCounts, contextCounts) {
	var maxCount = 0;
	for (var i = 0; i < clusters.length; i++) {
		var cluster = clusters[i];
		cluster.initialCount = initialCounts[cluster.id] || 0;
		cluster.contextCount = contextCounts[cluster.id] || 0;
		if (cluster.initialCount > maxCount)
			maxCount = cluster.initialCount;
		if (cluster.contextCount > maxCount)
			maxCount = cluster.contextCount;
	}

	var path = d3.geo.path().projection(proj);
	var toDraw = clusters.filter(function (cluster) {
		// We use a path to determine visibility, since the projection function can't determine if a point shouldn't be draw (eg in a orthographic projection)
		var screenCentre = path({ type: "Point", coordinates: cluster.centre });
		if (screenCentre != undefined) {
			cluster.screenCentre = proj(cluster.centre);
			return true;
		} else
			return false;
	});

	// Custom events to communicate clicks
	function triggerDown(cluster) {
		$(svg).trigger('clickclusterdown', [cluster]);
	}
	function triggerUp(cluster) {
		$(svg).trigger('clickclusterup', [cluster]);
	}

	var countScale = 10.81;
	group.selectAll("cluster")
		.data(toDraw)
		.enter()
		.append("circle")
		.attr("cx", function(c) { return c.screenCentre[0]; })
		.attr("cy", function(c) { return c.screenCentre[1]; })
		.attr("r", function(c) { return Math.sqrt(c.initialCount * countScale * proj.scale() / maxCount); })
		.attr("class", function(c) { return "cluster initial id" + c.id + (c.selected ? " selected" : ""); })
		.on('mousedown', triggerDown)
		.on('mouseup', triggerUp);
	group.selectAll("cluster")
		.data(toDraw)
		.enter()
		.append("circle")
		.attr("cx", function(c) { return c.screenCentre[0]; })
		.attr("cy", function(c) { return c.screenCentre[1]; })
		.attr("r", function(c) { return Math.sqrt(c.contextCount * countScale * proj.scale() / maxCount); })
		.attr("class", function(c) { return "cluster context id" + c.id + (c.selected ? " selected" : ""); })
		.on('mousedown', triggerDown)
		.on('mouseup', triggerUp);
	group.selectAll("clustercount")
		.data(toDraw)
		.enter()
		.append("text")
		.attr("x", function(c) { return c.screenCentre[0]; })
		.attr("y", function(c) { return c.screenCentre[1]; })
		.attr("dy", "0.35em")
		.attr("text-anchor", 'middle')
		.text(function (c) { return c.contextCount > 0 ? c.contextCount : ""; })
		.attr("class", function (c) { return "cluster counttext id" + c.id; })
		.on('mousedown', triggerDown)
		.on('mouseup', triggerUp);

	return path;
}

function makeMapControls(container, projections, minZoom, maxZoom, defaults) {
	container.append(" \
		<div class=\"selbox\"> \
			<button type=\"button\" class=\"btn btn-mini btn-warning clear\">Clear selection</button> \
			<div class=\"btn-group mode\" data-toggle=\"buttons-radio\"></div> \
			<div class=\"btn-group zoomcontrols\"> \
				<button class=\"btn btn-mini zoomout\">-</button> \
				<a class=\"btn btn-mini dropdown-toggle zoomlevelbtn\" data-toggle=\"dropdown\" href=\"#\"><span class=\"value\"></span><span class=\"caret\"></span></a> \
				<div class=\"dropdown-menu zoomlevelmenu\"> \
					<div class=\"btn-group btn-group-vertical zoomlevel\" data-toggle=\"buttons-radio\"></div> \
				</div> \
				<button class=\"btn btn-mini zoomin\">+</button> \
			</div> \
		</div> \
		<div class=\"viewbox\"> \
			<button type=\"button\" class=\"btn btn-mini centreview\">Centre</button> \
			<div class=\"btn-group\"> \
				<a class=\"btn btn-mini dropdown-toggle view\" data-toggle=\"dropdown\" href=\"#\">View<span class=\"caret\"></span></a> \
				<div class=\"dropdown-menu viewsettingsmenu\"> \
					<div class=\"btn-group btn-group-vertical projection\" data-toggle=\"buttons-radio\"></div> \
					<ul class=\"viewchoices\"></ul> \
				</div> \
			</div> \
		</div> \
	");

	var modeElt = container.find(".selbox .mode");
	$.each({ toggle: "Toggle", drag: "Drag", pan: "Pan" }, function (key, value) {
		$("<button class=\"btn btn-mini\" value=\"" + key + "\">" + value + "</button>").appendTo(modeElt);
	});
	function updateSelMode() {
		var defBtn = modeElt.find("button[value=" + defaults.selectionMode + "]");
		defBtn.button('toggle');
		defBtn.trigger('click');
	}

	var curZoom = defaults.zoomLevel;
	var zoomBtnElt = container.find(".zoomlevelbtn");
	var zoomElt = container.find(".zoomlevel");
	$.each([1, 2, 3, 4, 5], function (key, value) {
		$("<button class=\"btn btn-mini\" value=\"" + value + "\">" + value + "</button>").appendTo(zoomElt);
	});
	zoomElt.find("button").bind('click', function () {
		var value = $(this).val();
		zoomBtnElt.find(".value").html(value);
		$(this).button('toggle');
		curZoom = +value;
	});
	function updateZoom() {
		var btn = zoomElt.find("button[value=" + curZoom + "]");
		btn.button('toggle');
		btn.trigger('click');
	}

	var zoomOutEnt = container.find(".zoomout");
	var zoomInElt = container.find(".zoomin");
	zoomOutEnt.on('click', function () {
		if (curZoom > minZoom) {
			curZoom -= 1;
			updateZoom();
		}
	});
	zoomInElt.on('click', function () {
		if (curZoom < maxZoom) {
			curZoom += 1;
			updateZoom();
		}
	});

	var projElt = container.find(".projection");
	$.each(projections, function (key, proj) {
		$("<button class=\"btn btn-mini\" value=\"" + key + "\">" + proj.name + "</button>").appendTo(projElt);
	});
	projElt.find("button").bind('click', function () {
		$(this).button('toggle');
	});
	function updateProj() {
		var curProj = defaults.projection;
		var btn = projElt.find("button[value=" + curProj + "]");
		btn.button('toggle');
		btn.trigger('click');
	}

	var choicesElt = container.find(".viewchoices");
	$.each({ graticule: "Graticules", currentcountryboundary: "Current countries" }, function (key, name) {
		$("<li><label class=\"checkbox\"><input type=\"checkbox\" value=\"" + key + "\">" + name + "</label></li>").appendTo(choicesElt);
	});
	// First pass to make the checkedness consistent
	$.each(defaults.viewChoices, function (key, value) {
		if (!value)
			choicesElt.find("input[value=" + key + "]").trigger('click');
	});
	function updateViewChoices() {
		var curChoices = defaults.viewChoices;
		$.each(curChoices, function (key, value) {
			choicesElt.find("input[value=" + key + "]").trigger('click');
		});
	}

	// Have our dropdown menus not close on a click inside them. This means that we
	// have to manually call button('toggle') in a couple of places above to keep
	// the visuals working.
	container.find(".dropdown-menu").bind('click', function (event) {
		event.stopPropagation();
	});

	return function () {
		updateSelMode();
		updateZoom();
		updateProj();
		updateViewChoices();
	}
}

function loadSettingsCookies(defaults) {
	var value = $.cookie("mapprojection");
	if (value != null)
		defaults.projection = value;
	$.each(defaults.viewChoices, function (setting, choice) {
		var value = $.cookie("mapviewchoice" + setting);
		if (value != null)
			defaults.viewChoices[setting] = (value == 'true');
	});
}

function saveSettingsCookie(name, value) {
	$.cookie(name, value, { expires: 7 });
}

function setupMap(container, initialQuery, globalQuery, minZoom, maxZoom) {
	// The view space for SVG; this doesn't have to correspond to screen units
	// (since we're using preserveAspectRatio).
	var viewBox = { x: 0, y : 0, width: 1024, height: 768 };
	// Margins for the map.
	var margins = { left: 10, right: 10, top: 10, bottom: 10, between: 10 };

	var outerElt = $("<div class=\"map\"></div>").appendTo(container);
	var topBoxElt = $("<div class=\"topbox\"></div>").appendTo(outerElt);
	var svgElt = $("<svg viewBox=\"" + viewBox.x + " " + viewBox.y + " " + viewBox.width + " " + viewBox.height + "\" preserveAspectRatio=\"xMidYMid meet\"></svg>").appendTo(outerElt);
	var loadingElt = makeLoadingIndicator().appendTo(outerElt);

	var defaultSettings = {
		selectionMode: 'toggle',
		zoomLevel: 1,
		projection: 'hobodyer',
		viewChoices: {
			graticule: false,
			currentcountryboundary: false
		}
	};
	loadSettingsCookies(defaultSettings);
	var initControls = makeMapControls(topBoxElt, mapProjections, minZoom, maxZoom, defaultSettings);

	fillElement(container, outerElt, 'vertical');
	setupPanelled(outerElt, topBoxElt, svgElt, 'vertical', 0, false);

	var svg = jqueryToD3(svgElt);
	var box = { x: viewBox.x + margins.left, y: viewBox.y + margins.top, width: viewBox.width - margins.left - margins.right, height: viewBox.height - margins.top - margins.bottom };

	var ownCnstrQuery = new Query(globalQuery.backendUrl());
	var constraint = new Constraint();
	globalQuery.addConstraint(constraint);
	ownCnstrQuery.addConstraint(constraint);
	var contextQuery = new Query(globalQuery.backendUrl(), 'setminus', globalQuery, ownCnstrQuery);
	var clusterInfoQuery = new Query(globalQuery.backendUrl());

	var initialWatcher = new ResultWatcher(function () {});
	initialQuery.addResultWatcher(initialWatcher);
	var contextWatcher = new ResultWatcher(function () {});
	contextQuery.addResultWatcher(contextWatcher);
	var clusterInfoWatcher = new ResultWatcher(function () {});
	clusterInfoQuery.addResultWatcher(clusterInfoWatcher);

	var mapData = null,
	    clustersInfo = null,
	    initialCounts = null,
	    contextCounts = null,
	    projection = null,
	    zoomLevel = null,
	    viewChoices = {},
	    pan = null;
	var curState = null,
	    curProj = null,
	    panFactor = 1.0;
	var selMode = null;
	function update(quick) {
		if (mapData == null || clustersInfo == null || initialCounts == null || contextCounts == null || projection == null || zoomLevel == null || viewChoices == null || pan == null) {
			svgElt.css('display', 'none');
			loadingElt.css('display', '');
		} else {
			loadingElt.css('display', 'none');
			svgElt.css('display', '');
			if (curProj == null) {
				curProj = projection.proj();
				curProj.translate([viewBox.x + viewBox.width / 2, viewBox.y + viewBox.height / 2]);
			}
			var totalScaleFactorChange = projection.scaleFactorChange * (zoomLevel - 1);
			var newScale = viewBox.width * (projection.initialScaleFactor + totalScaleFactorChange);
			var oldScale = curProj.scale();
			curProj.scale(newScale);
			if (curState == null) {
				svgElt.find(".map").remove();
				curState = {};
				curState.group = svg.append("g");
				curState.path = drawWorld(svg, curState.group, mapData, curProj);
				newPath = true;
			} else if (!quick) {
				curState.path.projection(curProj);
			}
			if (projection.panMode == 'translate') {
				var f = newScale / oldScale;
				pan = [pan[0] * f, pan[1] * f];
				panFactor = 1.0;				
				curState.group.attr("transform", "translate(" + pan[0] + "," + pan[1] + ")");
			} else if (projection.panMode == 'rotate') {
				panFactor = 0.7 / (0.85 * zoomLevel);
				curState.group.attr("transform", "");
				curProj.rotate([pan[0], -pan[1]]);
			} else
				console.log("warning: unknown projection pan mode \"" + projection.panMode + "\"");
			if (!quick || projection.panMode == 'rotate') {
				svg.selectAll("path").attr("d", curState.path);
				$.each(viewChoices, function (setting, choice) {
					svg.select("." + setting).style('display', choice ? '' : 'none');
				});
				svgElt.find(".cluster").remove();
				curState.clustersPath = drawClusters(svg, curState.group, curProj, clustersInfo, initialCounts, contextCounts);
			}
		}
	}
	function resetProjection() {
		pan = [0, 0];
		curProj = null;
	}

	var clearElt = topBoxElt.find(".clear");
	function updateSelection() {
		if (clustersInfo != null) {
			if (curState.clustersPath == null)
				update();
			for (var i = 0; i < clustersInfo.length; i++) {
				var cluster = clustersInfo[i];
				if (cluster.selected != cluster.lastSelected) {
					svg.selectAll(".cluster.id" + cluster.id).classed("selected", cluster.selected);
				}
				cluster.lastSelected = cluster.selected;
			}

			var ids = [];
			for (var i = 0; i < clustersInfo.length; i++)
				if (clustersInfo[i].selected)
					ids.push(clustersInfo[i].id);
			if (ids.length > 0) {
				constraint.name("Map: " + ids.length + (ids.length == 1 ? " cluster" : " clusters") + " at detail level " + zoomLevel);
				constraint.set({
					type: 'mapclusters',
					detaillevel: zoomLevel - 1,
					ids: ids
				});
				clearElt.removeAttr('disabled');
			} else {
				constraint.clear();
				clearElt.attr('disabled', 'disabled');
			}
			globalQuery.update();
		}
	}
	function selectAll(value) {
		if (clustersInfo != null)
			for (var i = 0; i < clustersInfo.length; i++)
				clustersInfo[i].selected = value;
	}
	clearElt.attr('disabled', 'disabled');

	d3.json("map.json", function(error, incoming) {
		mapData = incoming;
		update();
	});

	topBoxElt.find(".selbox .clear").bind('click', function () {
		selectAll(false);
		updateSelection();
	});
	topBoxElt.find(".selbox .mode button").bind('click', function () {
		selMode = $(this).val();
	});
	topBoxElt.find(".selbox .zoomlevel button").bind('click', function () {
		var zoom = +$(this).val();
		if (zoom != zoomLevel) {
			zoomLevel = zoom;
			clusterInfoWatcher.set({
				clusters: {
					type: 'mapclustersinfo',
					detaillevel: zoomLevel - 1
				}
			});
			initialWatcher.set({
				counts: {
					type: 'countbymapcluster',
					detaillevel: zoomLevel - 1
				}
			});
			contextWatcher.set({
				counts: {
					type: 'countbymapcluster',
					detaillevel: zoomLevel - 1
				}
			});
			clusterInfoQuery.update();
			selectAll(false);
			updateSelection();
			update();
		}
	});
	topBoxElt.find(".viewbox .projection button").bind('click', function () {
		var name = $(this).val();
		resetProjection();
		projection = mapProjections[name];
		saveSettingsCookie("mapprojection", name);
		update();
	});
	topBoxElt.find(".viewbox .centreview").bind('click', function () {
		resetProjection();
		update();
	});
	topBoxElt.find(".viewbox .viewchoices input").bind('click', function () {
		var setting = $(this).val();
		var choice = $(this).prop('checked');
		viewChoices[setting] = choice;
		saveSettingsCookie("mapviewchoice" + setting, choice);
		update();
	});

	var drag = d3.behavior.drag();
	var mouseDownOnCluster = false;
	pan = [0, 0];
	$(svg).bind('clickclusterdown', function (event, cluster) {
		if (d3.event.button == 0)
			mouseDownOnCluster = true;
	});
	$(svg).bind('clickclusterup', function (event, cluster) {
		if (mouseDownOnCluster && selMode == 'toggle') {
			cluster.selected = !(cluster.selected == true);
			updateSelection();
		}
	});
	makeDragEndWatcher(drag, function () {
		mouseDownOnCluster = false;
	});
	makeDragPan(drag, function (movement) {
		pan = movement;
		update(true);
	}, function () { return [pan[0], pan[1]]; }, function () { return panFactor; }, function () {
		return (selMode == 'toggle' && !mouseDownOnCluster) || selMode == 'pan';
	});
	makeDragSelector(drag, svg, "dragselectextent", function (extent) {
		for (var i = 0; i < clustersInfo.length; i++) {
			var cluster = clustersInfo[i];
			if (cluster.screenCentre != null) {
				var x = cluster.screenCentre[0], y = cluster.screenCentre[1];
				if (x >= extent[0][0] && y >= extent[0][1] && x <= extent[1][0] && y <= extent[1][1])
					cluster.selected = true;
			}
		}
		updateSelection();
	}, function () {
		return selMode == 'drag';
	});
	svg.call(drag);

	constraint.onChange(function (changeType) {
		if (changeType == 'removed') {
			selectAll(false);
			update();
		}
	});
	clusterInfoWatcher.setCallback(function (result) {
		var zoomResult = result.clusters[zoomLevel - 1];
		var clusters = [];
		for (var id in zoomResult) {
			var cluster = zoomResult[id];
			cluster.id = id;
			clusters.push(cluster);
		}
		clustersInfo = clusters;
		update();
	});
	initialQuery.onChange(function () {
		initialCounts = null;
		update();
	});
	initialWatcher.setCallback(function (result) {
		initialCounts = result.counts.counts;
		update();
	});
	contextQuery.onChange(function () {
		contextCounts = null;
		update();
	});
	contextWatcher.setCallback(function (result) {
		contextCounts = result.counts.counts;
		update();
	});

	initControls();
}