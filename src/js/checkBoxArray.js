export const checkBoxes = (selection, props) => {
  const { filterkey, xfdim, xfgroup, filters } = props;

  // semantic-ui checkbox markup:
  //  `<div class="checkbox" id={}>
  //      <label>
  //          <input type="checkbox" value="${}" checked>
  //          ${}
  //      </label>
  //  </div>`

  let myfilters = filters[filterkey];

  let keys = xfgroup.top("Infinity").filter(d => d.value > 0);
  keys.sort((a, b) => a.key - b.key);

  // an object to contain the checkbox status for each checkbox
  let checkbox_map = {};
  keys.forEach(
    d => (checkbox_map[d.key] = myfilters.indexOf(d.key) > -1 ? true : false)
  );

  // use d3 to create our checkboxes:
  let cbarray = selection
    .enter()
    .append("div")
    .merge(selection);

  let clearAll = cbarray
    .selectAll(".clear-link")
    .data([null])
    .enter()
    .append("a")
    .attr("class", "clear-link")
    .attr("href", "#")
    .text("Clear All")
    .on("click", function() {
      let checkboxes = cbarray
        .selectAll("input[type=checkbox]")
        .property("checked", false);
      filters[filterkey] = [];
      xfdim.filter();
    });

  let selectAll = cbarray
    .selectAll(".select-link")
    .data([null])
    .enter()
    .append("a")
    .attr("class", "select-link")
    .attr("href", "#")
    .classed("ui right floated", true)
    .text("Select All")
    .on("click", function() {
      let checkboxes = cbarray
        .selectAll("input[type=checkbox]")
        .property("checked", true);
      filters[filterkey] = keys.map(d => d.key);
      xfdim.filter(val => myfilters.indexOf(val) > -1);
    });

  let boxes = cbarray.selectAll("div").data(keys, d => d.key);

  boxes.exit().remove();

  let boxesEnter = boxes
    .enter()
    .append("div")
    .attr("class", "inline field");

  boxesEnter = boxesEnter.merge(boxes);

  let uiCheckbox = boxesEnter.append("div").attr("class", "checkbox");

  uiCheckbox
    .append("input")
    .attr("type", "checkbox")
    .property("checked", d => {
      return checkbox_map[d.key];
    })
    .attr("value", d => d.key)
    .on("click", function() {
      if (this.checked) {
        // add the value that was just selected.
        myfilters.push(this.value);
      } else {
        // remove the value of the box that was just unchecked
        myfilters = myfilters.filter(val => val !== this.value);
      }
      filters[filterkey] = myfilters;
      xfdim.filter(val => myfilters.indexOf(val) > -1);
    });



  uiCheckbox.append("filterkey").text(d => d.key + " (n=" + d.value + ")");
};
