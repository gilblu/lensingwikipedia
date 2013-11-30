/*
 * Things especially specific to the The Aviation Herald domain.
 */

function createDescriptionList(container) {
	return $("<dl></dl>").appendTo(container);
}
function clearDescriptionList(listElt) {
	listElt.find("dt,dd").remove();
}
function addToDescriptionList(descriptions, listElt) {
	function prepareReplacements(event) {
		var replacements = [];
		$.each(event.descriptionReplacements, function (itemText, itemInfo) {
			replacements.push([itemText, itemInfo]);
		});
		replacements.sort(function (repA, repB) { return repA[1].span[0] - repB[1].span[0] });
		return replacements;
	}

	function replace(text, replacements, initIndexOffset) {
		if (initIndexOffset == null)
			initIndexOffset = 0;

		function clean(text) {
			var escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
			return text.replace(/\[[0-9]+\]|[&<>]/g, function (old) {
				return escapes.hasOwnProperty(old) ? escapes[old] : "";
			});
		}

		var lastEndIndex = 0,
		    indexOffset = -initIndexOffset;
		$.each(replacements, function (id, item) {
			var itemText = item[0], itemInfo = item[1];
			var i = itemInfo.span[0], j = itemInfo.span[1];
			if (i < initIndexOffset || j > initIndexOffset + text.length) {
				// continue
			} else if (i < lastEndIndex) {
				console.log("warning: span " + i + ":" + j + " \"" + itemText + "\" overlaps previous span, not making a link");
			} else if (itemInfo.hasOwnProperty('url')) {
				var url = itemInfo.url;
				if (text.lastIndexOf("http://", 0) !== 0)
					url = baseWikipediaUrl + url;
				var link = "<a href=\"" + url + "\">" + itemText + "</a>";
				var oldLen = text.length;
				text = text.substring(0, lastEndIndex + indexOffset) + clean(text.substring(lastEndIndex + indexOffset, i + indexOffset)) + link + text.substring(j + indexOffset, text.length);
				lastEndIndex = j;
				indexOffset += text.length - oldLen;
			}
		});
		text = text.substring(0, lastEndIndex + indexOffset) + clean(text.substring(lastEndIndex + indexOffset, text.length));

		return text;
	}

	$.each(descriptions, function (id, event) {
		event.descriptionReplacements = JSON.parse(event.descriptionReplacements);

		// Find reference links and remove them from replacements
		var refLinks = [];
		$.each(event.descriptionReplacements, function (itemText, itemInfo) {
			if (itemText == itemInfo.url)
				refLinks.push(itemInfo.url);
		});
		$.each(refLinks, function (i, url) {
			delete event.descriptionReplacements[url];
		});
		// Clip to before the reference links
		var i = event.description.indexOf("http://");
		if (i > 0)
			event.description = event.description.substring(0, i);

		var sentenceSpan = event.sentenceSpan.split(",");
		var sentenceStartIndex = +sentenceSpan[0];
		var replacements = prepareReplacements(event);

		var tooltipText = "Event ID " + event.dbid + " in " + event.year;
		if (event.hasOwnProperty('eventRoot'))
			tooltipText += ", predicate stem '" + event.eventRoot + "'";
		tooltipText += ".";

		var shortDesc = replace(event.sentence, replacements, sentenceStartIndex);
		var longDesc = replace(event.description, replacements);

		var refsElt = $("<ul class=\"eventrefs\"></ul>");
		$.each(refLinks, function (i, url) {
			$("<li><a href=\"" + url + "\" target=\"_blank\"><span class=\"icon-globe\"></span></a></li>").appendTo(refsElt);
		});

		var dtElt = $("<dt title=\"" + tooltipText + "\"><a href=\"" + event.url + "\">" + event.title + "</a></dt>").appendTo(listElt);
		var ddElt = $("<dd>" + shortDesc + "</dd>").appendTo(listElt);
		dtElt.find("a").attr('target', '_blank');
		ddElt.find("a").attr('target', '_blank');
		var expandFullElt = $("<span class=\"icon-plus\"></span>").appendTo(ddElt);
		var fullElt = $("<div class=\"eventfulldescription\">" + longDesc + "</div>").appendTo(ddElt);
		refsElt.appendTo(ddElt);
		expandFullElt.click(function () {
			$(this).toggleClass('icon-plus icon-minus');
			fullElt.toggleClass('expanded');
		});
	});
}
