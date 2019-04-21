// a function for the more detailed dataset I found on-line
export function prepare_data(data) {
  return {
    year: data.year,
    clipa: data.clipa,
    grid: data.grid,
    dev_desc: data.dev_desc,
    species: data.species,
    strainname: data.strainname,
    nostocked: +data.nostocked,
    yreq: +data.yreq,
    events: +data.events
  };
}
