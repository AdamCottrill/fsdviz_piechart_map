import debug from "debug";

import { json, tsv, select } from "d3";
import crossfilter from "crossfilter2";

import { checkBoxes } from "./checkBoxArray";

import { prepare_stocking_data, initialize_filter } from "./utils";

const log = debug("app:log");

if (ENV !== "production") {
  debug.enable("*");
  const now = new Date().toString().slice(16, -33);
  log(`Debugging is enabled! (${now})`);
} else {
  debug.disable();
}

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec"
];

// our spatial dimensions will need custom reducer functions that will
// keep track of the number of events, yealing equivalents, and total
// number stocked by species - if the species exists update, if not
// create it, if event count is 0 delete it.

// what can be species_name, strain, life_stage, stk_method
const what = "species_name";

// for each group('what'), we want to return an object of the form:

//{
// yreq : ,
// total: ,
// events: ,
//}

const reduceAdd = (p, v) => {
  let counts = p[v[what]] || { yreq: 0, total: 0, events: 0 };
  counts.yreq += v.yreq;
  counts.total += v.total_stocked;
  counts.events += v.events;
  p[v[what]] = counts;
  return p;
};

const reduceRemove = (p, v) => {
  let counts = p[v[what]] || { yreq: 0, total: 0, events: 0 };
  counts.yreq -= v.yreq;
  counts.total -= v.total_stocked;
  counts.events -= v.events;
  //p[v[what]] = (p[v[what]] || 0) - v.yreq;
  return p;
};

const reduceInitial = () => {
  return {};
};

const filters = {};

// the name of the column with our response:
const column = "events";

json(dataURL, prepare_stocking_data).then(data => {
  data.forEach(d => prepare_stocking_data(d));

  console.log("data[0] = ", data[0]);

  let ndx = crossfilter(data);

  let lakeDim = ndx.dimension(d => d.lake);
  let agencyDim = ndx.dimension(d => d.agency_abbrev);
  let stateProvDim = ndx.dimension(d => d.stateprov);
  let jurisdictionDim = ndx.dimension(d => d.jurisdiction_slug);
  let manUnitDim = ndx.dimension(d => d.man_unit);
  let grid10Dim = ndx.dimension(d => d.grid10);
  let speciesDim = ndx.dimension(d => d.species_name);
  let strainDim = ndx.dimension(d => d.strain);
  let yearClassDim = ndx.dimension(d => d.year_class);
  let lifeStageDim = ndx.dimension(d => d.life_stage);
  let markDim = ndx.dimension(d => d.mark);
  let monthDim = ndx.dimension(d => d.month);
  let stkMethDim = ndx.dimension(d => d.stk_method);

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

  let lakeGroup = lakeDim
    .group()
    .reduce(reduceAdd, reduceRemove, reduceInitial);
  console.log("lakeGroup.top(Infinity) = ", lakeGroup.top(Infinity));

  //ininitialize our filters - all checked at first
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

  // if the crossfilter changes, update our checkboxes:

  ndx.onChange(() => {
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
  });
});
