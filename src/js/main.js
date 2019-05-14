/* global accessToken */

import debug from "debug";

import crossfilter from "crossfilter2";
import {
  selectAll,
  json,
  select,
  sum,
  geoPath,
  geoTransform,
  min,
  max
} from "d3";

import bbox from "@turf/bbox";
import Leaflet from "leaflet";

import { checkBoxes } from "./checkBoxArray";

import { prepare_stocking_data, initialize_filter } from "./utils";
import { stockingAdd, stockingRemove, stockingInitial } from "./reducers";

import { piechart_overlay } from "./piechart_overlay";
import { spatialRadioButtons } from "./RadioButtons";
import { update_stats_panel } from "./stats_panel";

const log = debug("app:log");

if (ENV !== "production") {
  debug.enable("*");
  const now = new Date().toString().slice(16, -33);
  log(`Debugging is enabled! (${now})`);
} else {
  debug.disable();
}

// variables to keep track of currently selected object and spatial scale
let spatialScale = "basin";
let selectedGeom;

// setup the map with rough bounds (need to get pies to plot first,
// this will be tweaked later):
const mymap = Leaflet.map("mapid", {
  zoomDelta: 0.25,
  zoomSnap: 0
}).fitBounds([[41.38, -92.09], [49.01, -76.05]]);

Leaflet.tileLayer(
  "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}",
  {
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery � <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: "mapbox.streets",
    accessToken: accessToken
  }
).addTo(mymap);

//// Add a svg layer to the map
Leaflet.svg().addTo(mymap);
//
//// Select the svg area and add a group element we can use to move things around:
let svg = select("#mapid").select("svg");

let mapg = svg.append("g");

// this fucntion is used for points events (centroids and mouse clicks)
function projectPoint(x, y) {
  const point = mymap.latLngToLayerPoint(new Leaflet.LatLng(y, x));
  return point;
}

// this function is used to draw our polygons:
function projectPointPath(x, y) {
  const point = mymap.latLngToLayerPoint(new Leaflet.LatLng(y, x));
  this.stream.point(point.x, point.y);
}

const transform = geoTransform({ point: projectPointPath });
const geoPathGenerator = geoPath().projection(transform);

let overlay = piechart_overlay(mymap).getProjection(projectPoint);

//======================================================

const filters = {};

const column = "events";
// the name of the columnwith our response:
const responseVar = "yreq";
//const responseVar = 'events';

// radio buttons
let strata = [
  { strata: "lake", label: "Lake" },
  { strata: "stateProv", label: "State/Province" },
  { strata: "jurisdiction", label: "Jurisdiction" },
  { strata: "mu", label: "Managment Unit" },
  { strata: "grid10", label: "10-minute Grid" },
  { strata: "geom", label: "Reported Point" }
];

let spatialSelector = spatialRadioButtons()
  .selector("#strata-selector")
  .strata(strata)
  .checked(spatialUnit);

spatialSelector();

// our radio button listener
const spatial_resolution = selectAll("#strata-form input");

Promise.all([
  json(dataURL),
  json("./data/centroids.json"),
  json("./data/fsdviz.geojson")
]).then(([data, centroids, topodata]) => {
  const lake_features = topojson.feature(topodata, topodata.objects.lakes)
    .features;
  const jurisdiction_features = topojson.feature(
    topodata,
    topodata.objects.jurisdictions
  ).features;
  const manUnit_features = topojson.feature(topodata, topodata.objects.mus)
    .features;

  // create a lookup array we will use for displaying pretty names for things
  // identifeid by a slug:
  let labelLookup = {};
  lake_features.forEach(
    d => (labelLookup[d.properties.slug] = d.properties.label)
  );
  jurisdiction_features.forEach(
    d => (labelLookup[d.properties.slug] = d.properties.label)
  );
  manUnit_features.forEach(
    d => (labelLookup[d.properties.slug] = d.properties.label)
  );

  // turf.union actually onlty takes two polygons - not an arbitrary number.
  // just use bbox on each lake and get the extents of those:
  const bboxes = lake_features.map(d => bbox(d));
  const basin_bbox = [
    min(bboxes, d => d[0]),
    min(bboxes, d => d[1]),
    max(bboxes, d => d[2]),
    max(bboxes, d => d[3])
  ];

  // a helper function that will trasform the bounding box from turf.js to
  // the pair of arrays required by leaflet:
  const bb_points = bb => [[bb[1], bb[0]], [bb[3], bb[2]]];

  mymap.fitBounds(bb_points(basin_bbox));

  // TODO: - move all of these functions into ./utils.js

  // a funtion used by mouseover events to apply highlighted class to
  // the selected polygon
  function highlightGeom() {
    select(this).classed("highlighted-geom", true);
    if (spatialScale !== "manunit") {
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
    if (what !== "manunit") {
      spatialScale = what;
      let features = what === "lake" ? lake_features : jurisdiction_features;
      let feature = features.filter(d => d.properties.label === label)[0];
      let mybbox = bbox(feature.geometry);
      selectedGeom = feature.properties.slug;
      mymap.flyToBounds(bb_points(mybbox));

      // clear the breadcrumbs for levels lower than 'what'
      clearBreadcrumb("manunit");
      if (what === "lake") {
        clearBreadcrumb("jurisdiction");
      }
    }
  };

  // when the breadrumb for a particular scale is clicked,
  // zoom to its extent
  function breadCrumbClick() {
    let what = this.id.split("-")[0];
    let label = this.text;
    zoomToFeature(what, label);
  }

  // when a geometry is clicked, zoom to its extent and add a bread
  // crumb to the list of existing breadcrumbs. Uses semantic-ui formatting.
  const addBreadcrumb = (what, label) => {
    let html = '<div class="divider"> / </div>';
    html += `<a class="section" id="${what}-breadcrumb-link">${label}</a>`;
    let selector = `#${what}-breadcrumb`;
    select(selector).html(html);
    select(selector + "-link").on("click", breadCrumbClick);
  };

  // remove the item of the thelist of breadcrumbs that correspond to what
  const clearBreadcrumb = what => {
    let selector = `#${what}-breadcrumb`;
    select(selector).html("");
  };

  //    LAKES
  const lakes = mapg
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
    select(this).classed("highlighted", false);
    select("#next-unit").text("");
    selectedGeom = d.properties.slug;
    spatialScale = "lake";
    const polygon_bbox = bbox(d.geometry);
    mymap.flyToBounds(bb_points(polygon_bbox));

    //Update Bread crumb
    addBreadcrumb(spatialScale, d.properties.label);
  });

  //    JURISDICTIONS
  const jurisdictions = mapg
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
    select(this).classed("highlighted", false);
    select("#next-unit").text("");
    selectedGeom = d.properties.slug;
    spatialScale = "jurisdiction";
    const polygon_bbox = bbox(d.geometry);
    mymap.flyToBounds(bb_points(polygon_bbox));

    addBreadcrumb(spatialScale, d.properties.label);
  });

  //    MANAGEMENT UNITS
  const manUnits = mapg
    .append("g")
    .selectAll("path")
    .data(manUnit_features)
    .enter()
    .append("path")
    .attr("class", "geopath")
    .classed("manunit", true)
    .attr("id", d => d.properties.slug)
    .on("mouseover", highlightGeom)
    .on("mouseout", unhighlightGeom);

  manUnits.on("click", function(d) {
    select(this).classed("highlighted", false);
    select("#next-unit").text("");
    selectedGeom = d.properties.slug;
    spatialScale = "manunit";
    const polygon_bbox = bbox(d.geometry);
    mymap.flyToBounds(bb_points(polygon_bbox));

    addBreadcrumb(spatialScale, d.properties.label);
  });

  //=====================================
  select("#basin-breadcrumb-link").on("click", () => {
    // when the basin breadcrumb is clicked, set the map to the bounding box for the basin,
    // set the visibility of the other breadcrumbs to none
    // set the values for Lake, Jurisdiction, and ManUnit to None as well.

    spatialScale = "basin";
    selected = "";

    mymap.flyToBounds(bb_points(basin_bbox));

    clearBreadcrumb("manunit");
    clearBreadcrumb("jurisdiction");
    clearBreadcrumb("lake");
  });

  // when we pan or zoom, redraw polygons - which ones are visible
  //  depends on the currenly selected spatial scale.

  // when we pan or zoom, redraw polygons - which ones are visible
  //  depends on the currenly selected spatial scale.

  const updateGeoms = () => {
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

  mymap.on("moveend", function() {
    updateGeoms();
    mapg.call(overlay);
  });

  // prepare our stocking data
  data.forEach(d => prepare_stocking_data(d));

  let ndx = crossfilter(data);

  let all = ndx.groupAll().reduce(stockingAdd, stockingRemove, stockingInitial);

  let lakeDim = ndx.dimension(d => d.lake);
  let agencyDim = ndx.dimension(d => d.agency_abbrev);
  let stateProvDim = ndx.dimension(d => d.stateprov);
  let jurisdictionDim = ndx.dimension(d => d.jurisdiction_slug);
  let manUnitDim = ndx.dimension(d => d.man_unit);
  let grid10Dim = ndx.dimension(d => d.grid10);
  let geomDim = ndx.dimension(d => d.geom);
  let speciesDim = ndx.dimension(d => d.species_name);
  let strainDim = ndx.dimension(d => d.strain);
  let yearClassDim = ndx.dimension(d => d.year_class);
  let lifeStageDim = ndx.dimension(d => d.life_stage);
  let markDim = ndx.dimension(d => d.mark);
  let monthDim = ndx.dimension(d => d.month);
  let stkMethDim = ndx.dimension(d => d.stk_method);

  let lakeGroup = lakeDim.group().reduceSum(d => d[column]);
  let agencyGroup = agencyDim.group().reduceSum(d => d[column]);
  let stateProvGroup = stateProvDim.group().reduceSum(d => d[column]);
  let jurisdictionGroup = jurisdictionDim.group().reduceSum(d => d[column]);
  let manUnitGroup = manUnitDim.group().reduceSum(d => d[column]);
  let grid10Group = grid10Dim.group().reduceSum(d => d[column]);
  let speciesGroup = speciesDim.group().reduceSum(d => d[column]);
  let strainGroup = strainDim.group().reduceSum(d => d[column]);
  let yearClassGroup = yearClassDim.group().reduceSum(d => d[column]);
  let lifeStageGroup = lifeStageDim.group().reduceSum(d => d[column]);
  let markGroup = markDim.group().reduceSum(d => d[column]);
  let monthGroup = monthDim.group().reduceSum(d => d[column]);
  let stkMethGroup = stkMethDim.group().reduceSum(d => d[column]);

  // set-up our spatial groups - each key will contain an object with
  // the total number of fish stocked, the number of yearling equivalents,
  // and the total number of events.  the variable 'what' determines how the
  // groups are calculated
  let lakeMapGroup = lakeDim
    .group()
    .reduce(stockingAdd, stockingRemove, stockingInitial);

  let jurisdictionMapGroup = jurisdictionDim
    .group()
    .reduce(stockingAdd, stockingRemove, stockingInitial);

  let stateProvMapGroup = stateProvDim
    .group()
    .reduce(stockingAdd, stockingRemove, stockingInitial);

  let manUnitMapGroup = manUnitDim
    .group()
    .reduce(stockingAdd, stockingRemove, stockingInitial);

  let grid10MapGroup = grid10Dim
    .group()
    .reduce(stockingAdd, stockingRemove, stockingInitial);

  let geomMapGroup = geomDim
    .group()
    .reduce(stockingAdd, stockingRemove, stockingInitial);

  update_stats_panel(all);

  //ininitialize our filters - all checked at first
  initialize_filter(filters, "lake", lakeDim);
  initialize_filter(filters, "stateProv", stateProvDim);
  initialize_filter(filters, "jurisdiction", jurisdictionDim);
  initialize_filter(filters, "manUnit", manUnitDim);
  initialize_filter(filters, "agency", agencyDim);
  initialize_filter(filters, "species", speciesDim);
  initialize_filter(filters, "strain", strainDim);
  initialize_filter(filters, "yearClass", yearClassDim);
  initialize_filter(filters, "lifeStage", lifeStageDim);
  initialize_filter(filters, "mark", markDim);
  initialize_filter(filters, "stockingMonth", monthDim);
  initialize_filter(filters, "stkMeth", stkMethDim);

  let lakeSelection = select("#lake-filter");
  checkBoxes(lakeSelection, {
    filterkey: "lake",
    xfdim: lakeDim,
    xfgroup: lakeGroup,
    filters: filters
  });

  let stateProvSelection = select("#state-prov-filter");
  checkBoxes(stateProvSelection, {
    filterkey: "stateProv",
    xfdim: stateProvDim,
    xfgroup: stateProvGroup,
    filters: filters
  });

  let jurisdictionSelection = select("#jurisdiction-filter");
  checkBoxes(jurisdictionSelection, {
    filterkey: "jurisdiction",
    xfdim: jurisdictionDim,
    xfgroup: jurisdictionGroup,
    filters: filters
  });

  let manUnitSelection = select("#manUnit-filter");
  checkBoxes(manUnitSelection, {
    filterkey: "manUnit",
    xfdim: manUnitDim,
    xfgroup: manUnitGroup,
    filters: filters
  });

  let agencySelection = select("#agency-filter");
  checkBoxes(agencySelection, {
    filterkey: "agency",
    xfdim: agencyDim,
    xfgroup: agencyGroup,
    filters: filters
  });

  let speciesSelection = select("#species-filter");
  checkBoxes(speciesSelection, {
    filterkey: "species",
    xfdim: speciesDim,
    xfgroup: speciesGroup,
    filters: filters
  });

  let strainSelection = select("#strain-filter");
  checkBoxes(strainSelection, {
    filterkey: "strain",
    xfdim: strainDim,
    xfgroup: strainGroup,
    filters: filters
  });

  let yearClassSelection = select("#year-class-filter");
  checkBoxes(yearClassSelection, {
    filterkey: "yearClass",
    xfdim: yearClassDim,
    xfgroup: yearClassGroup,
    filters: filters
  });

  let markSelection = select("#mark-filter");
  checkBoxes(markSelection, {
    filterkey: "mark",
    xfdim: markDim,
    xfgroup: markGroup,
    filters: filters
  });

  let monthSelection = select("#stocking-month-filter");
  checkBoxes(monthSelection, {
    filterkey: "stockingMonth",
    xfdim: monthDim,
    xfgroup: monthGroup,
    filters: filters
  });

  let stkMethSelection = select("#stocking-method-filter");
  checkBoxes(stkMethSelection, {
    filterkey: "stkMeth",
    xfdim: stkMethDim,
    xfgroup: stkMethGroup,
    filters: filters
  });

  let lifeStageSelection = select("#life-stage-filter");
  checkBoxes(lifeStageSelection, {
    filterkey: "lifeStage",
    xfdim: lifeStageDim,
    xfgroup: lifeStageGroup,
    filters: filters
  });

  const ptAccessor = d =>
    Object.keys(d.value).map(x => d.value[x][responseVar]);

  const get_coordinates = pt => {
    let coords = pt.slice(pt.indexOf("(") + 1, pt.indexOf(")")).split(" ");
    return [parseFloat(coords[1]), parseFloat(coords[0])];
  };

  // a helper function to get the data in the correct format for plotting.
  const get_pts = (spatialUnit, centriods, ptAccessor) => {
    let pts;

    switch (spatialUnit) {
      case "lake":
        pts = Object.values(lakeMapGroup.all());
        break;
      case "stateProv":
        pts = Object.values(stateProvMapGroup.all());
        break;
      case "jurisdiction":
        pts = Object.values(jurisdictionMapGroup.all());
        break;
      case "mu":
        pts = Object.values(manUnitMapGroup.all());
        break;
      case "grid10":
        pts = Object.values(grid10MapGroup.all());
        break;
      case "geom":
        pts = Object.values(geomMapGroup.all());
        break;
    }

    if (spatialUnit === "geom") {
      pts.forEach(d => (d["coordinates"] = get_coordinates(d.key)));
    } else {
      pts.forEach(d => (d["coordinates"] = centroids[spatialUnit][d.key]));
    }
    pts.forEach(d => (d["total"] = sum(ptAccessor(d))));

    return pts.filter(d => d.total > 0);
  };

  //overlay.radiusAccessor(d => d.total).keyfield(spatialUnit);
  let pts = get_pts(spatialUnit, centroids, ptAccessor);
  mapg.data([pts]).call(overlay);

  spatial_resolution.on("change", function() {
    // when the radio buttons change, we and to update the selected
    // saptial strata and refesh the map
    spatialUnit = this.value;
    pts = get_pts(spatialUnit, centroids, ptAccessor);
    mapg.data([pts]).call(overlay);
    //refreshMap(spatial_xfDims);
  });

  // if the crossfilter changes, update our checkboxes:
  ndx.onChange(() => {
    update_stats_panel(all);

    checkBoxes(lakeSelection, {
      filterkey: "lake",
      xfdim: lakeDim,
      xfgroup: lakeGroup,
      filters: filters
    });

    checkBoxes(stateProvSelection, {
      filterkey: "stateProv",
      xfdim: stateProvDim,
      xfgroup: stateProvGroup,
      filters: filters
    });

    checkBoxes(jurisdictionSelection, {
      filterkey: "jurisdiction",
      xfdim: jurisdictionDim,
      xfgroup: jurisdictionGroup,
      filters: filters
    });

    checkBoxes(manUnitSelection, {
      filterkey: "manUnit",
      xfdim: manUnitDim,
      xfgroup: manUnitGroup,
      filters: filters
    });

    checkBoxes(agencySelection, {
      filterkey: "agency",
      xfdim: agencyDim,
      xfgroup: agencyGroup,
      filters: filters
    });

    checkBoxes(speciesSelection, {
      filterkey: "species",
      xfdim: speciesDim,
      xfgroup: speciesGroup,
      filters: filters
    });

    checkBoxes(strainSelection, {
      filterkey: "strain",
      xfdim: strainDim,
      xfgroup: strainGroup,
      filters: filters
    });

    checkBoxes(yearClassSelection, {
      filterkey: "yearClass",
      xfdim: yearClassDim,
      xfgroup: yearClassGroup,
      filters: filters
    });

    checkBoxes(markSelection, {
      filterkey: "mark",
      xfdim: markDim,
      xfgroup: markGroup,
      filters: filters
    });

    checkBoxes(monthSelection, {
      filterkey: "stockingMonth",
      xfdim: monthDim,
      xfgroup: monthGroup,
      filters: filters
    });

    checkBoxes(stkMethSelection, {
      filterkey: "stkMeth",
      xfdim: stkMethDim,
      xfgroup: stkMethGroup,
      filters: filters
    });

    checkBoxes(lifeStageSelection, {
      filterkey: "lifeStage",
      xfdim: lifeStageDim,
      xfgroup: lifeStageGroup,
      filters: filters
    });

    //update our map too:
    let pts = get_pts(spatialUnit, centroids, ptAccessor);
    mapg.data([pts]).call(overlay);
  });
});
