// a function to prepare the json stocking data for use in our map
export const prepare_stocking_data = data => {
  data.point = [+data.dd_lon, +data.dd_lat];
  data.geom = "Point(" + data.dd_lon + " " + data.dd_lat + ")";
  data.total_stocked = +data.total_stocked;
  data.year_class = data.year_class ? data.year_class + "" : "Unkn";
  data.yreq = +data.yreq;
  data.mark = data.mark ? data.mark : "None";
  data.month = data.month ? data.month + "" : "0";
};

// a funciton to add an element to our filter registry for a dimension
// and set the filter to include all of the values in that dimension
// (all boxes will be checked to start)
export const initialize_filter = (filters, key, dim) => {
  filters[key] = dim
    .group()
    .all()
    .map(d => d.key);
  dim.filter(val => filters[key].indexOf(val) > -1);
};

//
//export const update_summary_table = data => {
//    // generate the html for rows of our summary table body.  for each species in data
//    // we want to generate html that looks like this:
//    //   <tr>
//    //       <td>${ row.species }</td>
//    //       <td>${ row.event_count }</td>
//    //       <td>${ commaFormat(row.total_stocked) }</td>
//    //   </tr>
//
//    let commaFormat = d3.format(',d');
//    html = "";
//
//    data.forEach(row => {
//
//        html += `<tr>
//           <td>${ row.key }</td>
//           <td>${ row.value.events }</td>
//           <td>${ commaFormat(row.value.total) }</td>
//       </tr>`;
//    });
//
//    d3.select("#stocked-summary-table-tbody").html(html);
//
//}
//
//
//export const update_stats_panel = data =>{
//    // this function calculates the total number of fish stocked and
//    // the number of events by species and then updates the stat panel.
//
//    let byspecies = d3.nest()
//        .key(d =>  d.species )
//        .rollup(values => { return {
//            total: d3.sum(values, d => +d.total_yreq_stocked ),
//            events: values.length,
//        };
//                          })
//        .entries(data);
//
//    // sort out table by total number stocked:
//    byspecies.sort((a,b) => b.value.total - a.value.total);
//
//    let species_count = byspecies.length;
//    let event_count = d3.sum(byspecies, d=>d.value.events);
//    let total_stocked = d3.sum(byspecies, d=>d.value.total);
//
//    let commaFormat = d3.format(',d');
//
//    d3.selectAll("#species-count").text(commaFormat(species_count));
//    d3.selectAll("#event-count").text(commaFormat(event_count));
//    d3.selectAll("#total-stocked").text(commaFormat(total_stocked));
//
//    update_summary_table(byspecies);
//
//
//}
//
// a generalized group by function for our points. It uses d3.nest to
// calculate the total number of events and fish stocked at each
// point.  'groupby' provides a second level of grouping. it returns
// an array of obj - one for each pt-group by combination (pt-species,
// pt-lifestage ect.). Each object contains a geom label, coordinates,
// value, and stat element.

//export const group_pts = (data, groupby, value) => {
//
//   let pts = d3.nest()
//        .key(d =>  d.geom )
//        .key( d => d[groupby] )
//        .rollup(values => { return {
//            total: d3.sum(values, d => +d[value] ),
//            events: values.length,
//        };
//                          })
//        .entries(data);
//
//    let flat =[];
//
//    pts.forEach(pt=>{
//        pt.values.forEach(x=> {
//            flat.push({
//                geom:pt.key,
//                coordinates:get_coordinates(pt.key),
//                value:x.key,
//                stats:x.value});
//        });
//    });
//
//    //finally - sort our aggregated data from largest to smallest so
//    // that smaller points plot on top of larger ones and we can click
//    // or hover over them.
//    flat.sort((a,b) => b.stats.total - a.stats.total);
//
//    return flat;
//}
//
