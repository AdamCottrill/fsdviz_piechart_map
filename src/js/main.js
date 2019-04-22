import debug from "debug";

import { json, tsv, select } from "d3";
import crossfilter from "crossfilter2";

import { checkBoxes } from "./checkBoxArray";

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

const prepare_stocking_data = data => {
  data.point = [+data.dd_lon, +data.dd_lat];
  data.total_stocked = +data.total_stocked;
  data.year_class = data.year_class ? data.year_class + "" : "Unkn";
  data.yreq = +data.yreq;
  data.mark = data.mark ? data.mark : "None";
  data.month = data.month ? data.month + "" : "0";
  //data.stockingMonth = months.indexOf(data.month) ? months[data.month] : "Unkn";
};

const initialize_filter = (key, dim) => {
  filters[key] = dim
    .group()
    .all()
    .map(d => d.key);
  dim.filter(val => filters[key].indexOf(val) > -1);
};

// the name of the column with our response:
const column = "events";

const filters = {};

json(dataURL, prepare_stocking_data).then(data => {
  data.forEach(d => prepare_stocking_data(d));

  console.log("data[0] = ", data[0]);

  let ndx = crossfilter(data);

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

  //ininitialize our filters - all checked at first
  initialize_filter("stateProv", stateProvDim);
  initialize_filter("jurisdiction", jurisdictionDim);
  initialize_filter("manUnit", manUnitDim);
  initialize_filter("agency", agencyDim);
  initialize_filter("species", speciesDim);
  initialize_filter("strain", strainDim);
  initialize_filter("yearClass", yearClassDim);
  initialize_filter("lifeStage", lifeStageDim);
  initialize_filter("mark", markDim);
  initialize_filter("stockingMonth", monthDim);
  initialize_filter("stkMeth", stkMethDim);

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
