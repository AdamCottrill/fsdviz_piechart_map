// a re-usabel chart component that will overlay points a map.

import {
  arc,
  pie,
  descending,
  event,
  select,
  selectAll,
  max,
  sum,
  scaleSqrt,
  scaleOrdinal,
  format,
  schemeCategory10
} from 'd3';



export const mapbox_overlay = map => {
  // default values:

  let radiusAccessor = d => d.total;
  let fillAccessor = d => d.value;
  let  responseVar = 'yreq';

  let maxCircleSize = 70;
  let fillColours = schemeCategory10;

  let  myArc = arc().innerRadius(0);
  let  myPie = pie()
    .sort(null)
    .value( fillAccessor );

  const commaFormat = format(',d');

  // the name of the field that uniquely identifies each point:
  let keyfield = 'geom';

  let pointInfoSelector = '#point-info';
  //

  // we can project a lonlat coordinate pair using mapbox's built in projection function
  // takes an array of lon-lat and returns pixel corrdinates

  // this assimes that a map objects has been created in your
  // environment and is called 'map'!!
  const mapboxProjection = lonlat => {
    let pt = map.project(new mapboxgl.LngLat(lonlat[0], lonlat[1]));
    return [pt.x, pt.y];
  };

  let get_pointInfo = d => {

    // this does not work as expected - it needs to be updated if the
    // filters change.
    let data = d.values;
    let dataArray = Object.keys(data).map(x=>data[x]);
    dataArray.sort((a,b) => b.value - a.value);
    let total = sum(dataArray.map(d=>d.value));

    let html = `<h5>${d.key}: ${commaFormat(total)}</h5>`;
    html += '<table class="ui celled compact table">';
    dataArray.filter(d=> d.value > 0 ).forEach(row => {
      html += `<tr id="tr-${ row.slice.replace(' ', '-') }">
           <td class="species-name">${ row.slice }</td>
           <td class="right aligned">${ commaFormat(row.value) }</td>
       </tr>`;
    });

    html += '</table>';
    return html;


    //
    //  let commaFormat = d3.format(',d');
    //
    //  let fish = commaFormat(d.stats.total);
    //  let events = commaFormat(d.stats.events);
    //
    //
    //  let html  =`<div class="ui card">
    //  <div class="content">
    //      <div class="header">${d.value}</div>
    //  </div>
    //  <div class="content">
    //      <div class="ui small feed">
    //          <div class="event">
    //              <div class="content">
    //                  <ul>
    //                      <li>${fish} Fish</li>
    //                      <li>${events} Events</li>
    //                  </ul>
    //        </div>
    //                </div>
    //            </div>
    //    </div>`;
    //
    //  return html;
  };


  const chart = function(selection) {
    selection.each(function(data) {
      //const radiusScale = scaleSqrt()
      // .range([0, maxCircleSize])
      //  .domain([0, max(data, radiusAccessor)]);


      let colourScale = scaleOrdinal(schemeCategory10);

      // prepare data for pie:
      //    coordinates: [-82.8801, 45.9883]
      //    key: "er_mi"
      //    total: 10000
      //    values: [{slice: "Rainbow Trout", value:0}, {slice: "Lake Trout", value: 10} ]

      data.forEach(x => {
        let mykeys = Object.keys(x.value);
        let values = mykeys.map(d=> ({slice:d,  value: x.value[d][responseVar] }));
        x['values'] = values;
      });

      // our fill categories will always be determined by the
      // unique values returned by our fill accessor:
      const fillcategories = [...new Set(data.map(x => fillAccessor(x)))];

      let fillScale = scaleOrdinal(fillColours).domain(fillcategories);

      //==========================================================
      //             PIE CHARTS

      // sort our pies so small pies plot on top of large pies
      data.sort((a,b) => descending(a.total, b.total));

      const radiusScale = scaleSqrt()
        .range([1, maxCircleSize])
        .domain([0, max(data, radiusAccessor)]);


      let pies = selection.selectAll('.pie')
        .data(data, d => d.key );

      pies.exit().transition().duration(200).remove();

      let piesEnter = pies.enter().append('g')
        .attr('class', 'pie')
      //          .on( 'mouseover', function (d) {
      //            select(this).classed('hover', true);
      //            //console.log('d = ', d);
      //            // if nothing selected show the info for this pie
      //            //if (!myMap.selected) {
      //            //  select('#point-info').html(myMap.pointInfo(d));
      //            //}
      //          })
      //          .on( 'mouseout', function (d) {
      //            select(this).classed('hover', false);
      //            // if nothing selected delete the info for this pie
      //            //if (!myMap.selected) {
      //            //  select('#point-info').html('');
      //            //}
      //          })
        .on('click', function(d){
          if (selected && selected === d.key){
            // second click on same circle, turn off selected and make point info empty:
            selected = null;
            select('#point-info').html('');
            selectAll('.selected').classed('selected', false);
          } else {
            // set selected, fill in map info and highlight our selected pie
            selected = d.key;
            select('#point-info').html(get_pointInfo(d));
            selectAll('.selected').classed('selected', false);
            select(this).classed('selected', true);
          }
        });

      pies.merge(piesEnter)
        .attr('transform', function (d){
          let translate = mapboxProjection(d.coordinates);
          return 'translate(' + translate +')';
        })
        .transition().duration(200)
        .each(onePie);

      // a function that represents one pie chart. Repeated for each
      // elements selected above
      function onePie(d) {

        const highlight_row = (d, bool) => {
          let selector = '#tr-' + d.data.slice.replace(' ','-');
          //console.log('selector = ', selector);
          let tmp = selectAll(selector);
          tmp.classed('error', bool);

          //console.log('tmp = ', tmp);
        };

        let r = radiusScale(d.total);

        let svg = select(this)
          .attr('width', r * 2)
          .attr('height', r * 2);

        let slices = svg.selectAll('.arc')
          .data(d => myPie(d.values), d => d.index);

        let slicesEnter = slices.enter()
          .append('path')
          .attr('class', 'arc')
          .on( 'mouseover', function (d) {
            select(this).classed('hover', true);
            if (selected) {
              highlight_row(d, true);
              //select('#point-info').html(get_sliceInfo(d));
            }
          })
          .on( 'mouseout', function (d) {
            select(this).classed('hover', false);
            highlight_row(d,false);

          });




        slices.merge(slicesEnter)
          .attr('d', myArc.outerRadius(r))
          .style('fill', d => colourScale(d.data.slice));

        slices.exit().remove();

      }










      //
      //      let dots = selection.selectAll('circle').data(data, d => d[keyfield]);
      //
      //      dots.exit().remove();
      //
      //      const dotsEnter = dots
      //        .enter()
      //        .append('circle')
      //        .attr('class', 'stockingEvent')
      //        .attr('r', d => radiusScale(radiusAccessor(d)))
      //        .attr('fill', d => fillScale(fillAccessor(d)))
      //        .on('click', function(d) {
      //          if (selected_event && selected_event === d[keyfield]) {
      //            // second click on same circle, turn off selected and make point info empty:
      //            selected_event = null;
      //            select(pointInfoSelector).html('');
      //            selectAll('.selected').classed('selected', false);
      //          } else {
      //            // set selected, fill in map info and highlight our selected pie
      //
      //            selected_event = d[keyfield];
      //            select(pointInfoSelector).html(get_pointInfo(d));
      //            selectAll('.selected').classed('selected', false);
      //            select(this).classed('selected', true);
      //          }
      //        })
      //        .on('mouseover', function(d) {
      //          select(this).classed('hover', true);
      //        })
      //        .on('mouseout', function(d) {
      //          select(this).classed('hover', false);
      //        });
      //
      //      dots
      //        .merge(dotsEnter)
      //        .attr('cx', d => mapboxProjection(d.coordinates)[0])
      //            .attr('cy', d => mapboxProjection(d.coordinates)[1]);
      //
      //


    });
  };

  // update our data
  chart.data = function(value) {
    if (!arguments.length) return data;
    data = value;
    return chart;
  };

  chart.mapbox = function(value) {
    if (!arguments.length) return mapboxMap;
    mapboxMap = value;
    return chart;
  };

  chart.radiusAccessor = function(value) {
    if (!arguments.length) return radiusAccessor;
    radiusAccessor = value;
    return chart;
  };

  chart.fillAccessor = function(value) {
    if (!arguments.length) return fillAccessor;
    fillAccessor = value;
    return chart;
  };

  chart.fillColours = function(value) {
    if (!arguments.length) return fillColours;
    fillColours = value;
    return chart;
  };

  chart.keyfield = function(value) {
    if (!arguments.length) return keyfield;
    keyfield = value;
    return chart;
  };

  chart.maxCircleSize = function(value) {
    if (!arguments.length) return maxCircleSize;
    maxCircleSize = value;
    return chart;
  };

  chart.pointInfoSelector = function(value) {
    if (!arguments.length) return pointInfoSelector;
    pointInfoSelector = value;
    return chart;
  };

  // the function that populates point infor div with information
  // about the selected point
  chart.get_pointInfo = function(value) {
    if (!arguments.length) return get_pointInfo;
    get_pointInfo = value;
    return chart;
  };

  return chart;
};
