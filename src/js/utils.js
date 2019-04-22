
// a function to prepare the json stocking data for use in our map
export const prepare_stocking_data = data => {
  data.point = [+data.dd_lon, +data.dd_lat];
  data.total_stocked = +data.total_stocked;
  data.year_class = data.year_class ? data.year_class + "" : "Unkn";
  data.yreq = +data.yreq;
  data.mark = data.mark ? data.mark : "None";
  data.month = data.month ? data.month + "" : "0";
};

// a funciton to add an element to our filter registry for a dimension
// and set the filter to include all of the values in that dimension
// (all boxes will be checked to start)
export const initialize_filter = (key, dim) => {
  filters[key] = dim
    .group()
    .all()
    .map(d => d.key);
  dim.filter(val => filters[key].indexOf(val) > -1);
};
