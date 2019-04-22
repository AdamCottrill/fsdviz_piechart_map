// our spatial dimensions will need custom reducer functions that will
// keep track of the number of events, yealing equivalents, and total
// number stocked by species - if the species exists update, if not
// create it, if event count is 0 delete it.

// for each group('what'), we want to return an object of the form:

//{
// yreq : ,
// total: ,
// events: ,
//}

export const stockingAdd = (p, v) => {
  let counts = p[v[what]] || { yreq: 0, total: 0, events: 0 };
  counts.yreq += v.yreq;
  counts.total += v.total_stocked;
  counts.events += v.events;
  p[v[what]] = counts;
  return p;
};

export const stockingRemove = (p, v) => {
  let counts = p[v[what]] || { yreq: 0, total: 0, events: 0 };
  counts.yreq -= v.yreq;
  counts.total -= v.total_stocked;
  counts.events -= v.events;
  //p[v[what]] = (p[v[what]] || 0) - v.yreq;
  return p;
};

export const stockingInitial = () => {
  return {};
};
