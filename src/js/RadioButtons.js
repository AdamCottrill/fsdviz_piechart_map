import { select, selectAll } from "d3";

export const spatialRadioButtons = () => {
  let strata = [
    { strata: "basin", label: "Basin" },
    { strata: "grid10", label: "10-Minute Grid" },
    { strata: "grid5", label: "5-Minute Grid" },
    { strata: "site", label: "Named Site" }
  ];

  let checked = strata[strata.length - 1].strata;
  let selector = "#strata-selector";

  function buttons() {
    let strataSelector = select(selector).data([null]);

    let strataForm = strataSelector.append("form").attr("id", "strata-form");

    let strataButtons = strataForm
      .selectAll("span")
      .data(strata)
      .enter()
      .append("span");

    strataButtons
      .append("input")
      .attr("type", "radio")
      .attr("value", d => d.strata)
      .attr("class", "strataButtons")
      .property("checked", d => d.strata === checked);

    strataButtons
      .insert("text")
      .text(d => d.label)
      .append("br");
  }

  buttons.checked = function(value) {
    if (!arguments.length) return checked;
    checked = value;
    return buttons;
  };

  buttons.strata = function(value) {
    if (!arguments.length) return strata;
    strata = value;
    return buttons;
  };

  buttons.selector = function(value) {
    if (!arguments.length) return selector;
    selector = value;
    return buttons;
  };

  // expose a method to update the radio buttons so we can keep them
  // in sync with other controls.
  buttons.refresh = () => {
    let strataButtons = selectAll(".strataButtons").property(
      "checked",
      d => d.strata === checked
    );
  };

  return buttons;
};
