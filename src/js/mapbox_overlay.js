// a re-usabel chart component that will overlay points a map.

import {
  select,
  selectAll,
  max,
  scaleSqrt,
  scaleOrdinal,
  format,
  schemeCategory10
} from "d3";

export const mapbox_overlay = map => {
  // default values:

  let radiusAccessor = d => d.stats.total;
  let fillAccessor = d => d.value;
  let maxCircleSize = 50;
  let fillColours = schemeCategory10;

  // the name of the field that uniquely identifies each point:
  let keyfield = "geom";

  //    let pointInfoSelector = '#point-info';
  //

  // we can project a lonlat coordinate pair using mapbox's built in projection function
  // takes an array of lon-lat and returns pixel corrdinates

  // this assimes that a map objects has been created in your
  // environment and is called 'map'!!
  const mapboxProjection = lonlat => {
    let pt = map.project(new mapboxgl.LngLat(lonlat[0], lonlat[1]));
    return [pt.x, pt.y];
  };

  //    let get_pointInfo = d => {
  //
  //        let commaFormat = d3.format(',d');
  //
  //        let fish = commaFormat(d.stats.total);
  //        let events = commaFormat(d.stats.events);
  //
  //
  //        let html  =`<div class="ui card">
  //        <div class="content">
  //            <div class="header">${d.value}</div>
  //        </div>
  //        <div class="content">
  //            <div class="ui small feed">
  //                <div class="event">
  //                    <div class="content">
  //                        <ul>
  //                            <li>${fish} Fish</li>
  //                            <li>${events} Events</li>
  //                        </ul>
  //              </div>
  //                      </div>
  //                  </div>
  //          </div>`;
  //
  //        return html;
  //    };
  //

  const chart = function(selection) {
    selection.each(function(data) {
      const radiusScale = scaleSqrt()
        .range([0, maxCircleSize])
        .domain([0, max(data, radiusAccessor)]);

      // our fill categories will always be determined by the
      // unique values returned by our fill accessor:
      const fillcategories = [...new Set(data.map(x => fillAccessor(x)))];

      let fillScale = scaleOrdinal(fillColours).domain(fillcategories);

      let dots = selection.selectAll("circle").data(data, d => d[keyfield]);

      dots.exit().remove();

      const dotsEnter = dots
        .enter()
        .append("circle")
        .attr("class", "stockingEvent")
        .attr("r", d => radiusScale(radiusAccessor(d)))
        .attr("fill", d => fillScale(fillAccessor(d)))
        .on("click", function(d) {
          if (selected_event && selected_event === d[keyfield]) {
            // second click on same circle, turn off selected and make point info empty:
            selected_event = null;
            select(pointInfoSelector).html("");
            selectAll(".selected").classed("selected", false);
          } else {
            // set selected, fill in map info and highlight our selected pie

            selected_event = d[keyfield];
            select(pointInfoSelector).html(get_pointInfo(d));
            selectAll(".selected").classed("selected", false);
            select(this).classed("selected", true);
          }
        })
        .on("mouseover", function(d) {
          select(this).classed("hover", true);
        })
        .on("mouseout", function(d) {
          select(this).classed("hover", false);
        });

      dots
        .merge(dotsEnter)
        .attr("cx", d => mapboxProjection(d.coordinates)[0])
        .attr("cy", d => mapboxProjection(d.coordinates)[1]);
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
