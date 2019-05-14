/* global accessToken */

import debug from 'debug';

import { selectAll, json, tsv, select, sum, geoPath, geoTransform } from 'd3';

import crossfilter from 'crossfilter2';

//import * as L from "leaflet";
import Leaflet from 'leaflet';

import { checkBoxes } from './checkBoxArray';

import { prepare_stocking_data, initialize_filter } from './utils';
import { stockingAdd, stockingRemove, stockingInitial } from './reducers';

import { piechart_overlay } from './piechart_overlay';
import { spatialRadioButtons } from './RadioButtons';
import { update_stats_panel } from './stats_panel';

const log = debug('app:log');

if (ENV !== 'production') {
  debug.enable('*');
  const now = new Date().toString().slice(16, -33);
  log(`Debugging is enabled! (${now})`);
} else {
  debug.disable();
}

// lat-lon for leaflet:
let mapBounds = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];

const mymap = Leaflet.map('mapid', {
  zoomDelta: 0.25,
  zoomSnap: 0
}).fitBounds(
  //    bb_points(basin_bbox)
  mapBounds
);

Leaflet.tileLayer(
  'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
  {
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery � <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: accessToken
  }
).addTo(mymap);

//// Add a svg layer to the map
Leaflet.svg().addTo(mymap);
//
//// Select the svg area and add a group element we can use to move things around:
let svg = select('#mapid').select('svg');

let mapg = svg.append('g');

function projectPoint(x, y) {
  const point = mymap.latLngToLayerPoint(new Leaflet.LatLng(y, x));
  return point;
}

const transform = geoTransform({ point: projectPoint });
const geoPathGenerator = geoPath().projection(transform);

let overlay = piechart_overlay(mymap).getProjection(projectPoint);

mymap.on('moveend', function() {
  mapg.call(overlay);
});

//======================================================

const filters = {};

const column = 'events';
// the name of the columnwith our response:
const responseVar = 'yreq';
//const responseVar = 'events';

// radio buttons
let strata = [
  { strata: 'lake', label: 'Lake' },
  { strata: 'stateProv', label: 'State/Province' },
  { strata: 'jurisdiction', label: 'Jurisdiction' },
  { strata: 'mu', label: 'Managment Unit' },
  { strata: 'grid10', label: '10-minute Grid' },
  { strata: 'geom', label: 'Reported Point' }
];

let spatialSelector = spatialRadioButtons()
  .selector('#strata-selector')
  .strata(strata)
  .checked(spatialUnit);

spatialSelector();

// our radio button listener
const spatial_resolution = selectAll('#strata-form input');

Promise.all([json(dataURL), json('data/centroids.json')]).then(
  ([data, centroids]) => {
    // prepare our stocking data
    data.forEach(d => prepare_stocking_data(d));

    let ndx = crossfilter(data);

    let all = ndx
      .groupAll()
      .reduce(stockingAdd, stockingRemove, stockingInitial);

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
    initialize_filter(filters, 'lake', lakeDim);
    initialize_filter(filters, 'stateProv', stateProvDim);
    initialize_filter(filters, 'jurisdiction', jurisdictionDim);
    initialize_filter(filters, 'manUnit', manUnitDim);
    initialize_filter(filters, 'agency', agencyDim);
    initialize_filter(filters, 'species', speciesDim);
    initialize_filter(filters, 'strain', strainDim);
    initialize_filter(filters, 'yearClass', yearClassDim);
    initialize_filter(filters, 'lifeStage', lifeStageDim);
    initialize_filter(filters, 'mark', markDim);
    initialize_filter(filters, 'stockingMonth', monthDim);
    initialize_filter(filters, 'stkMeth', stkMethDim);

    let lakeSelection = select('#lake-filter');
    checkBoxes(lakeSelection, {
      filterkey: 'lake',
      xfdim: lakeDim,
      xfgroup: lakeGroup,
      filters: filters
    });

    let stateProvSelection = select('#state-prov-filter');
    checkBoxes(stateProvSelection, {
      filterkey: 'stateProv',
      xfdim: stateProvDim,
      xfgroup: stateProvGroup,
      filters: filters
    });

    let jurisdictionSelection = select('#jurisdiction-filter');
    checkBoxes(jurisdictionSelection, {
      filterkey: 'jurisdiction',
      xfdim: jurisdictionDim,
      xfgroup: jurisdictionGroup,
      filters: filters
    });

    let manUnitSelection = select('#manUnit-filter');
    checkBoxes(manUnitSelection, {
      filterkey: 'manUnit',
      xfdim: manUnitDim,
      xfgroup: manUnitGroup,
      filters: filters
    });

    let agencySelection = select('#agency-filter');
    checkBoxes(agencySelection, {
      filterkey: 'agency',
      xfdim: agencyDim,
      xfgroup: agencyGroup,
      filters: filters
    });

    let speciesSelection = select('#species-filter');
    checkBoxes(speciesSelection, {
      filterkey: 'species',
      xfdim: speciesDim,
      xfgroup: speciesGroup,
      filters: filters
    });

    let strainSelection = select('#strain-filter');
    checkBoxes(strainSelection, {
      filterkey: 'strain',
      xfdim: strainDim,
      xfgroup: strainGroup,
      filters: filters
    });

    let yearClassSelection = select('#year-class-filter');
    checkBoxes(yearClassSelection, {
      filterkey: 'yearClass',
      xfdim: yearClassDim,
      xfgroup: yearClassGroup,
      filters: filters
    });

    let markSelection = select('#mark-filter');
    checkBoxes(markSelection, {
      filterkey: 'mark',
      xfdim: markDim,
      xfgroup: markGroup,
      filters: filters
    });

    let monthSelection = select('#stocking-month-filter');
    checkBoxes(monthSelection, {
      filterkey: 'stockingMonth',
      xfdim: monthDim,
      xfgroup: monthGroup,
      filters: filters
    });

    let stkMethSelection = select('#stocking-method-filter');
    checkBoxes(stkMethSelection, {
      filterkey: 'stkMeth',
      xfdim: stkMethDim,
      xfgroup: stkMethGroup,
      filters: filters
    });

    let lifeStageSelection = select('#life-stage-filter');
    checkBoxes(lifeStageSelection, {
      filterkey: 'lifeStage',
      xfdim: lifeStageDim,
      xfgroup: lifeStageGroup,
      filters: filters
    });

    const ptAccessor = d =>
      Object.keys(d.value).map(x => d.value[x][responseVar]);

    const get_coordinates = pt => {
      let coords = pt.slice(pt.indexOf('(') + 1, pt.indexOf(')')).split(' ');
      return [parseFloat(coords[1]), parseFloat(coords[0])];
    };

    // a helper function to get the data in the correct format for plotting.
    const get_pts = (spatialUnit, centriods, ptAccessor) => {
      let pts;

      switch (spatialUnit) {
      case 'lake':
        pts = Object.values(lakeMapGroup.all());
        break;
      case 'stateProv':
        pts = Object.values(stateProvMapGroup.all());
        break;
      case 'jurisdiction':
        pts = Object.values(jurisdictionMapGroup.all());
        break;
      case 'mu':
        pts = Object.values(manUnitMapGroup.all());
        break;
      case 'grid10':
        pts = Object.values(grid10MapGroup.all());
        break;
      case 'geom':
        pts = Object.values(geomMapGroup.all());
        break;
      }

      if (spatialUnit === 'geom') {
        pts.forEach(d => (d['coordinates'] = get_coordinates(d.key)));
      } else {
        pts.forEach(d => (d['coordinates'] = centroids[spatialUnit][d.key]));
      }
      pts.forEach(d => (d['total'] = sum(ptAccessor(d))));

      return pts.filter(d => d.total > 0);
    };

    //overlay.radiusAccessor(d => d.total).keyfield(spatialUnit);
    let pts = get_pts(spatialUnit, centroids, ptAccessor);
    mapg.data([pts]).call(overlay);

    spatial_resolution.on('change', function() {
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
        filterkey: 'lake',
        xfdim: lakeDim,
        xfgroup: lakeGroup,
        filters: filters
      });

      checkBoxes(stateProvSelection, {
        filterkey: 'stateProv',
        xfdim: stateProvDim,
        xfgroup: stateProvGroup,
        filters: filters
      });

      checkBoxes(jurisdictionSelection, {
        filterkey: 'jurisdiction',
        xfdim: jurisdictionDim,
        xfgroup: jurisdictionGroup,
        filters: filters
      });

      checkBoxes(manUnitSelection, {
        filterkey: 'manUnit',
        xfdim: manUnitDim,
        xfgroup: manUnitGroup,
        filters: filters
      });

      checkBoxes(agencySelection, {
        filterkey: 'agency',
        xfdim: agencyDim,
        xfgroup: agencyGroup,
        filters: filters
      });

      checkBoxes(speciesSelection, {
        filterkey: 'species',
        xfdim: speciesDim,
        xfgroup: speciesGroup,
        filters: filters
      });

      checkBoxes(strainSelection, {
        filterkey: 'strain',
        xfdim: strainDim,
        xfgroup: strainGroup,
        filters: filters
      });

      checkBoxes(yearClassSelection, {
        filterkey: 'yearClass',
        xfdim: yearClassDim,
        xfgroup: yearClassGroup,
        filters: filters
      });

      checkBoxes(markSelection, {
        filterkey: 'mark',
        xfdim: markDim,
        xfgroup: markGroup,
        filters: filters
      });

      checkBoxes(monthSelection, {
        filterkey: 'stockingMonth',
        xfdim: monthDim,
        xfgroup: monthGroup,
        filters: filters
      });

      checkBoxes(stkMethSelection, {
        filterkey: 'stkMeth',
        xfdim: stkMethDim,
        xfgroup: stkMethGroup,
        filters: filters
      });

      checkBoxes(lifeStageSelection, {
        filterkey: 'lifeStage',
        xfdim: lifeStageDim,
        xfgroup: lifeStageGroup,
        filters: filters
      });

      //update our map too:
      let pts = get_pts(spatialUnit, centroids, ptAccessor);
      mapg.data([pts]).call(overlay);
    });
  }
);
