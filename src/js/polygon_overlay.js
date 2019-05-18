/* global topojson   */

import bbox from "@turf/bbox";
import Leaflet from "leaflet";

import { select, geoPath, geoTransform, min, max } from "d3";

export const polygon_overlay = () => {
  let leafletMap;

  let basin_bbox;
  let lakes;
  let jurisdictions;
  let manUnits;

  let lake_features;
  let jurisdiction_features;
  let manUnit_features;

  let labelLookup;

  let spatialScale = "basin";
  let selectedGeom;

  // this function is used to draw our polygons in screen coordinates:
  function projectPointPath(x, y) {
    const point = leafletMap.latLngToLayerPoint(new Leaflet.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }

  const transform = geoTransform({ point: projectPointPath });
  const geoPathGenerator = geoPath().projection(transform);

  // a helper function that will trasform the bounding box from turf.js to
  // the pair of arrays required by leaflet:
  const bb_points = bb => [[bb[1], bb[0]], [bb[3], bb[2]]];

  // a function to update our cross filter filters based on map state
  // passed in from main.js once polygon_overlay has been instantiated.
  let updateCrossfilter = (dimension, value) => {};

  const geomClicked = function(d, what) {
    select(this).classed("highlighted", false);

    // update our globals
    selectedGeom = d.properties.slug;
    spatialScale = what;
    //Update Bread crumb
    select("#next-unit").text("");
    addBreadcrumb(spatialScale, d.properties.slug);
    //reset our map
    const polygon_bbox = bbox(d.geometry);
    leafletMap.flyToBounds(bb_points(polygon_bbox));

    updateCrossfilter(spatialScale, selectedGeom);
  };

  // create a lookup array we will use for displaying pretty names for things
  // identifeid by a slug:
  const makeLabelLookup = features => {
    let lookup = {};
    features.forEach(feature => {
      feature.forEach(d => (lookup[d.properties.slug] = d.properties.label));
    });
    return lookup;
  };

  // a funtion used by mouseover events to apply highlighted class to
  // the selected polygon
  function highlightGeom() {
    select(this).classed("highlighted-geom", true);
    if (spatialScale !== "manUnit") {
      select("#next-unit").text("/ " + labelLookup[this.id]);
    }
  }

  // a funtion used by mouseout events to remove teh highlighted class
  // from the selected polygon
  function unhighlightGeom() {
    select(this).classed("highlighted-geom", false);
    select("#next-unit").text("");
  }

  // used by click event on our polygon geometries - zoom to the extents
  // of the selected polygon
  const zoomToFeature = (what, label) => {
    if (what !== "manUnit") {
      spatialScale = what;
      let features = what === "lake" ? lake_features : jurisdiction_features;
      let feature = features.filter(d => d.properties.label === label)[0];
      let mybbox = bbox(feature.geometry);
      selectedGeom = feature.properties.slug;
      leafletMap.flyToBounds(bb_points(mybbox));

      // clear the breadcrumbs for levels lower than 'what'
      clearBreadcrumb("manUnit");
      if (what === "lake") {
        clearBreadcrumb("jurisdiction");
      }
    }
  };

  // when the breadrumb for a particular scale is clicked, clear any
  // existsing filters on 'lower' spatial scales and
  // zoom to its extent
  function breadCrumbClick() {
    let what = this.id.split("-")[0];
    let label = this.text;
    let slug = this.dataset["slug"];
    updateCrossfilter(what, slug);
    zoomToFeature(what, label);
  }

  // when a geometry is clicked, zoom to its extent and add a bread
  // crumb to the list of existing breadcrumbs. Uses semantic-ui formatting.
  const addBreadcrumb = (what, slug) => {
    let label = labelLookup[slug];
    let html = '<div class="divider"> / </div>';
    html += `<a class="section" id="${what}-breadcrumb-link" data-slug=${slug}>${label}</a>`;
    let selector = `#${what}-breadcrumb`;
    select(selector).html(html);
    select(selector + "-link").on("click", breadCrumbClick);
  };

  // remove the item of the thelist of breadcrumbs that correspond to what
  const clearBreadcrumb = what => {
    let selector = `#${what}-breadcrumb`;
    select(selector).html("");
    //TODO - clear filter for the appropriate spatial filter here
  };

  // add click event to our basin breadcrumb link - it must already exist on the page. the others are added dynamically.
  const basinBreadCrumbOnClick = () => {
    //=====================================
    select("#basin-breadcrumb-link").on("click", () => {
      // when the basin breadcrumb is clicked, set the map to the bounding box for the basin,
      // set the visibility of the other breadcrumbs to none
      // set the values for Lake, Jurisdiction, and ManUnit to None as well.

      spatialScale = "basin";
      selectedGeom = "";

      leafletMap.flyToBounds(bb_points(basin_bbox));

      clearBreadcrumb("manUnit");
      clearBreadcrumb("jurisdiction");
      clearBreadcrumb("lake");

      updateCrossfilter("basin", "");
    });
  };

  function chart(selection) {
    selection.each(function(topodata) {
      //===================================================
      // Polygons and Mapping geometries
      lake_features = topojson.feature(topodata, topodata.objects.lakes)
        .features;
      jurisdiction_features = topojson.feature(
        topodata,
        topodata.objects.jurisdictions
      ).features;
      manUnit_features = topojson.feature(topodata, topodata.objects.mus)
        .features;

      let tmp = manUnit_features.filter(
        d => d.properties.jurisdiction === "mi_wi"
      );

      labelLookup = makeLabelLookup([
        lake_features,
        jurisdiction_features,
        manUnit_features
      ]);

      // turf.union actually only takes two polygons - not an arbitrary number.
      // just use bbox on each lake and get the extents of those:
      const bboxes = lake_features.map(d => bbox(d));
      basin_bbox = [
        min(bboxes, d => d[0]),
        min(bboxes, d => d[1]),
        max(bboxes, d => d[2]),
        max(bboxes, d => d[3])
      ];

      leafletMap.fitBounds(bb_points(basin_bbox));

      basinBreadCrumbOnClick();

      //    LAKES
      lakes = selection
        .append("g")
        .selectAll("path")
        .data(lake_features)
        .enter()
        .append("path")
        .attr("class", "geopath")
        .classed("lake", true)
        .attr("id", d => d.properties.slug)
        .style("visibility", () =>
          spatialScale === "basin" ? "visible" : "hidden"
        )
        .on("mouseover", highlightGeom)
        .on("mouseout", unhighlightGeom);

      lakes.on("click", function(d) {
        geomClicked(d, "lake");
      });

      //    JURISDICTIONS
      jurisdictions = selection
        .append("g")
        .selectAll("path")
        .data(jurisdiction_features)
        .enter()
        .append("path")
        .attr("class", "geopath")
        .classed("jurisdiction", true)
        .attr("id", d => d.properties.slug)
        .on("mouseover", highlightGeom)
        .on("mouseout", unhighlightGeom);

      jurisdictions.on("click", function(d) {
        geomClicked(d, "jurisdiction");
      });

      //    MANAGEMENT UNITS
      manUnits = selection
        .append("g")
        .selectAll("path")
        .data(manUnit_features)
        .enter()
        .append("path")
        .attr("class", "geopath")
        .classed("manUnit", true)
        .attr("id", d => d.properties.slug)
        .on("mouseover", highlightGeom)
        .on("mouseout", unhighlightGeom);

      manUnits.on("click", function(d) {
        geomClicked(d, "manUnit");
      });
    });
  }

  // when we pan or zoom, redraw polygons - which ones are visible
  //  depends on the currenly selected spatial scale.

  chart.render = () => {
    lakes
      .attr("d", geoPathGenerator)
      .style("visibility", () =>
        spatialScale === "basin" ? "visible" : "hidden"
      );

    jurisdictions.attr("d", geoPathGenerator).style("visibility", d => {
      // we only want to display jurisdiction that are in the selected Lake:
      if ((spatialScale === "lake") & (d.properties.lake === selectedGeom)) {
        return "visible";
      } else {
        return "hidden";
      }
    });

    manUnits.attr("d", geoPathGenerator).style("visibility", d => {
      // we only want to display management units that are in the
      // selected jurisdiction or the selected management unit
      if (
        ((spatialScale === "jurisdiction") &
          (d.properties.jurisdiction === selectedGeom)) |
        (d.properties.slug === selectedGeom)
      ) {
        return "visible";
      } else {
        return "hidden";
      }
    });
  };

  chart.leafletMap = function(value) {
    if (!arguments.length) return leafletMap;
    leafletMap = value;
    return chart;
  };

  chart.updateCrossfilter = function(value) {
    if (!arguments.length) return updateCrossfilter;
    updateCrossfilter = value;
    return chart;
  };

  return chart;
};
