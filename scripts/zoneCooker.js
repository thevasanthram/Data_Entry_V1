const zoneData = require("./../resources/defaultZones");
var mod = require("nested-property");

let sampleData = {};
zoneData.map((zone) => {
 mod.set(sampleData, `${zone.category}.${zone.sub_category}._${zone.zone}`, {
  top_position: zone["top_position"],
  bottom_position: zone["bottom_position"],
  right_position: zone["right_position"],
  left_position: zone["left_position"],
  width: zone["width"],
  top_padding: zone["top_padding"],
  bottom_padding: zone["bottom_padding"],
  right_padding: zone["right_padding"],
  left_padding: zone["left_padding"],
 });
});

console.log(sampleData);
