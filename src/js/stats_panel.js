import { sum, format, select, selectAll } from "d3";

const update_summary_table = data => {
  // generate the html for rows of our summary table body.  for each species in data
  // we want to generate html that looks like this:
  //   <tr>
  //       <td>${ row.species }</td>
  //       <td>${ row.event_count }</td>
  //       <td>${ commaFormat(row.total_stocked) }</td>
  //   </tr>
  //
  // *NOTE* data also contain a column total - it could be include
  // *and could be toggled depending on what options the user has
  //selected.

  // ad species key to each summary object and create an
  // array of objects - sorted by yreq

  Object.keys(data).forEach(x => (data[x]["species"] = x));
  let dataArray = Object.keys(data).map(x => data[x]);

  dataArray.sort((a, b) => b.yreq - a.yreq);

  let commaFormat = format(",d");
  let html = "";

  dataArray
    .filter(d => d.events > 0)
    .forEach(row => {
      html += `<tr>
           <td class="species-name">${row.species}</td>
           <td class="center aligned">${row.events}</td>
           <td class="right aligned">${commaFormat(row.yreq)}</td>
       </tr>`;
    });

  select("#stocked-summary-table-tbody").html(html);
};

export const update_stats_panel = allxf => {
  // this function calculates the total number of fish stocked and
  // the number of events by species and then updates the stat panel.

  let current = allxf.value();

  // grand total accessor:
  const get_total = varname => {
    let mykeys = Object.keys(current);
    if (varname === "species") {
      mykeys = mykeys.filter(x => current[x]["events"] > 0);
      return mykeys.length;
    } else {
      return sum(mykeys.map(x => current[x][varname]));
    }
  };

  let total_stocked = get_total("total");
  let yreq_stocked = get_total("yreq");
  let event_count = get_total("events");
  let species_count = get_total("species");

  let commaFormat = format(",d");

  selectAll("#species-count").text(commaFormat(species_count));
  selectAll("#event-count").text(commaFormat(event_count));
  selectAll("#total-stocked").text(commaFormat(total_stocked));
  selectAll("#yreq-stocked").text(commaFormat(yreq_stocked));

  update_summary_table(current);
};
