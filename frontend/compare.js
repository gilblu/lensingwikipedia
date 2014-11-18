var currentFacet;

/*
 * Setup the control in some container element.
 * container: container element as a jquery selection
 * initialQuery: the initial (empty) query
 * globalQuery: the global query
 */
function setupCompare(container, globalQuery, facets) {
	/*  BEGIN BUILD UI */

	var outerElt = $('<div class="compare"></div>').appendTo(container);
	var formElt = $("<form></form>").appendTo(outerElt);
	var clearSelElt = $('<button type="button" class="btn btn-mini btn-warning clear mapclear" title="Clear">Clear selection</button>').appendTo(formElt);
	var modeElt = $('<select class="btn btn-mini"></select>').appendTo(formElt);
	var updateElt = $('<button type="submit" class="btn btn-warning" title="Update the visualization">Update</button></ul>').appendTo(formElt);

	var loadingIndicator = new LoadingIndicator(outerElt);

	function setLoadingIndicator(enabled) {
		//svgElt.css('display', !enabled ? '' : 'none');
		loadingIndicator.enabled(enabled);
	}

	$.each(facets, function (idx, facet) {
		$('<option value="' + idx + '">' + facet.title + ' facet</option>').appendTo(modeElt);
	});

	fillElement(container, outerElt, 'vertical');

	/* END BUILD UI */

	/* BEGIN CALLBACKS */

	updateElt.click(function(event) {
		setLoadingIndicator(true);
		currentFacet = facets[Number(modeElt.value())];
		// TODO get all the values from the facet somehow
	});

	// disable form because we don't want to refresh the page
	formElt.submit(function() {
		return false;
	});

	/* END CALLBACKS */
}
