import type { BoardDefinition } from "./types"
import { points } from "./geometry"
import { copper } from "./copper"

// Physical constraints and saved-fill references for the reviewed four-layer PCB.
export const board: BoardDefinition = {
  width: 30,
  height: 30,
  thickness: 1.6,
  layers: ["top","inner1","inner2","bottom"],
  sourceOrigin: {"x":142.45,"y":67.4},
  outline: points([[-15,15],[15,15],[15,-15],[-15,-15]]),
  setup: ["setup",["pad_to_mask_clearance","0"],["allow_soldermask_bridges_in_footprints","no"],["tenting",["front","yes"],["back","yes"]],["covering",["front","no"],["back","no"]],["plugging",["front","no"],["back","no"]],["capping","no"],["filling","no"],["pcbplotparams",["layerselection","0x00000000_00000000_55555555_5755f5ff"],["plot_on_all_layers_selection","0x00000000_00000000_00000000_00000000"],["disableapertmacros","no"],["usegerberextensions","no"],["usegerberattributes","yes"],["usegerberadvancedattributes","yes"],["creategerberjobfile","yes"],["dashed_line_dash_ratio","12"],["dashed_line_gap_ratio","3"],["svgprecision","4"],["plotframeref","no"],["mode","1"],["useauxorigin","no"],["pdf_front_fp_property_popups","yes"],["pdf_back_fp_property_popups","yes"],["pdf_metadata","yes"],["pdf_single_document","no"],["dxfpolygonmode","yes"],["dxfimperialunits","yes"],["dxfusepcbnewfont","yes"],["psnegative","no"],["psa4output","no"],["plot_black_and_white","yes"],["sketchpadsonfab","no"],["plotpadnumbers","no"],["hidednponfab","no"],["sketchdnponfab","yes"],["crossoutdnponfab","yes"],["subtractmaskfromsilk","no"],["outputformat","1"],["mirror","no"],["drillshape","0"],["scaleselection","1"],["outputdirectory","production/gerber/"]]],
  texts: [["gr_text","A-",["at","131.6","79.5","0"],["layer","F.SilkS"],["uuid","7be49fb8-ba51-488a-b725-8be92b2d0cff"],["effects",["font",["size","0.8","0.8"],["thickness","0.12"]]]],["gr_text","A+",["at","134.4","79.5","0"],["layer","F.SilkS"],["uuid","5fd55b67-535e-4f1a-bb48-6dec29c09a99"],["effects",["font",["size","0.8","0.8"],["thickness","0.12"]]]],["gr_text","B-",["at","153.5","74.8","0"],["layer","F.SilkS"],["uuid","3647c984-6f60-417d-b56f-8f5accc0d20b"],["effects",["font",["size","0.8","0.8"],["thickness","0.12"]]]],["gr_text","SW+",["at","153.8","78.55","0"],["layer","F.SilkS"],["uuid","a366b6b1-2567-44a2-8c70-1f993463f556"],["effects",["font",["size","0.8","0.8"],["thickness","0.12"]]]],["gr_text","SW-",["at","153.8","81.1","0"],["layer","F.SilkS"],["uuid","11d8f689-cf80-4358-944d-6d0879f51c30"],["effects",["font",["size","0.8","0.8"],["thickness","0.12"]]]],["gr_text","B+",["at","154","76","0"],["layer","F.SilkS"],["uuid","e810c9ef-d59e-4ed4-9b2f-5966304bdef8"],["effects",["font",["size","0.8","0.8"],["thickness","0.12"]]]],["gr_text","E-",["at","128.8","79.35","0"],["layer","F.SilkS"],["uuid","902030a0-58fd-4605-8a12-85a78bce38a7"],["effects",["font",["size","0.8","0.8"],["thickness","0.15"]]]],["gr_text","E+",["at","137.2","79.35","0"],["layer","F.SilkS"],["uuid","668c31ea-4043-4e5a-be56-8caa9717898e"],["effects",["font",["size","0.8","0.8"],["thickness","0.15"]]]],["gr_text","E-",["at","128.8","79.7","0"],["layer","B.SilkS"],["uuid","8c858a0d-1d19-4dee-8fed-8ec009ef532f"],["effects",["font",["size","0.8","0.8"],["thickness","0.15"]],["justify","mirror"]]],["gr_text","A-",["at","131.6","79.5","0"],["layer","B.SilkS"],["uuid","d2461ba2-f0d9-4104-a33f-fd4ea1abd66a"],["effects",["font",["size","0.8","0.8"],["thickness","0.15"]],["justify","mirror"]]],["gr_text","A+",["at","134.4","79.5","0"],["layer","B.SilkS"],["uuid","635ea3ed-bd79-48fa-b174-1a43806cb354"],["effects",["font",["size","0.8","0.8"],["thickness","0.15"]],["justify","mirror"]]],["gr_text","E+",["at","137.2","79.7","0"],["layer","B.SilkS"],["uuid","fe7c2538-ae23-4b09-befc-f47a71fbf1a9"],["effects",["font",["size","0.8","0.8"],["thickness","0.15"]],["justify","mirror"]]],["gr_text","B-",["at","153.5","73.5","0"],["layer","B.SilkS"],["uuid","af2f719f-bda6-4296-a472-100ec3a57d0d"],["effects",["font",["size","0.8","0.8"],["thickness","0.15"]],["justify","mirror"]]],["gr_text","SW+",["at","153.8","78.55","0"],["layer","B.SilkS"],["uuid","41c33b7e-3198-4fa7-ab03-b32c5b3d0ca7"],["effects",["font",["size","0.8","0.8"],["thickness","0.15"]],["justify","mirror"]]],["gr_text","SW-",["at","153.8","81.1","0"],["layer","B.SilkS"],["uuid","8b94b427-7b1c-49d1-8ce4-796aa84b7e7a"],["effects",["font",["size","0.8","0.8"],["thickness","0.15"]],["justify","mirror"]]],["gr_text","B+",["at","154","76","0"],["layer","B.SilkS"],["uuid","0a47f4ef-a9ea-4bda-b99c-387243903369"],["effects",["font",["size","0.8","0.8"],["thickness","0.15"]],["justify","mirror"]]]],
  zones: [
    {
      id: "e9ddafc2-d8e9-4388-b07a-649a31e70cd4",
      name: "L1_GND_flood",
      net: "GND",
      layers: ["top"],
      outlines: [points([[-15,14],[15,14],[15,-15],[-15,-15]])],
      fills: [{layer:"top",points:copper.top_0}, {layer:"top",points:copper.top_1}, {layer:"top",points:copper.top_2}],
      settings: [["net","GND"],["layer","F.Cu"],["uuid","e9ddafc2-d8e9-4388-b07a-649a31e70cd4"],["name","L1_GND_flood"],["hatch","edge","0.5"],["connect_pads","yes",["clearance","0.2"]],["min_thickness","0.2"],["fill","yes",["thermal_gap","0.5"],["thermal_bridge_width","0.5"],["island_removal_mode","0"]]],
    },
    {
      id: "219ff5e3-9dec-46ae-b5ce-3e82d11a81ec",
      name: "hx711_analog_via_keepout",
      net: null,
      layers: ["top","bottom","inner1","inner2"],
      outlines: [points([[-14.45,-6.6],[-2.45,-6.6],[-2.45,-14.5],[-14.45,-14.5]])],
      fills: [],
      settings: [["layers","F.Cu","B.Cu","In1.Cu","In2.Cu"],["uuid","219ff5e3-9dec-46ae-b5ce-3e82d11a81ec"],["name","hx711_analog_via_keepout"],["hatch","edge","0.5"],["connect_pads",["clearance","0"]],["min_thickness","0.25"],["keepout",["tracks","allowed"],["vias","not_allowed"],["pads","allowed"],["copperpour","allowed"],["footprints","allowed"]],["placement",["enabled","no"],["sheetname",""]],["fill",["thermal_gap","0.5"],["thermal_bridge_width","0.5"],["island_removal_mode","0"]]],
    },
    {
      id: "90cc899b-b72c-46b5-b1cf-f12d9da2e917",
      name: "antenna_keepout",
      net: null,
      layers: ["top","bottom","inner1","inner2"],
      outlines: [points([[-7.65,15],[6.25,15],[6.25,14],[-7.65,14]])],
      fills: [],
      settings: [["layers","F.Cu","B.Cu","In1.Cu","In2.Cu"],["uuid","90cc899b-b72c-46b5-b1cf-f12d9da2e917"],["name","antenna_keepout"],["hatch","edge","0.5"],["connect_pads",["clearance","0"]],["min_thickness","0.25"],["keepout",["tracks","not_allowed"],["vias","not_allowed"],["pads","allowed"],["copperpour","not_allowed"],["footprints","allowed"]],["placement",["enabled","no"],["sheetname",""]],["fill",["thermal_gap","0.5"],["thermal_bridge_width","0.5"],["island_removal_mode","0"]]],
    },
    {
      id: "d89b68ed-b699-472a-9382-9979d3b74e0f",
      name: "L4_GND_flood",
      net: "GND",
      layers: ["bottom"],
      outlines: [points([[-15,14],[15,14],[15,-15],[-15,-15]])],
      fills: [{layer:"bottom",points:copper.bottom_0}, {layer:"bottom",points:copper.bottom_1}, {layer:"bottom",points:copper.bottom_2}],
      settings: [["net","GND"],["layer","B.Cu"],["uuid","d89b68ed-b699-472a-9382-9979d3b74e0f"],["name","L4_GND_flood"],["hatch","edge","0.5"],["connect_pads","yes",["clearance","0.2"]],["min_thickness","0.2"],["fill","yes",["thermal_gap","0.5"],["thermal_bridge_width","0.5"],["island_removal_mode","0"]]],
    },
    {
      id: "34289f51-c058-42a4-a582-a75673c4a771",
      name: "L2_GND_plane",
      net: "GND",
      layers: ["inner1"],
      outlines: [points([[-15,15],[15,15],[15,-15],[-15,-15]])],
      fills: [{layer:"inner1",points:copper.inner1_0}],
      settings: [["net","GND"],["layer","In1.Cu"],["uuid","34289f51-c058-42a4-a582-a75673c4a771"],["name","L2_GND_plane"],["hatch","edge","0.5"],["priority","1"],["connect_pads","yes",["clearance","0.2"]],["min_thickness","0.2"],["fill","yes",["thermal_gap","0.5"],["thermal_bridge_width","0.5"],["island_removal_mode","0"]]],
    },
    {
      id: "6441086e-e366-448a-8c64-e0b15324a530",
      name: "L3_3V3_power",
      net: "+3V3",
      layers: ["inner2"],
      outlines: [points([[-15,15],[15,15],[15,-15],[-15,-15]])],
      fills: [{layer:"inner2",points:copper.inner2_0}, {layer:"inner2",points:copper.inner2_1}],
      settings: [["net","+3V3"],["layer","In2.Cu"],["uuid","6441086e-e366-448a-8c64-e0b15324a530"],["name","L3_3V3_power"],["hatch","edge","0.5"],["priority","1"],["connect_pads","yes",["clearance","0.2"]],["min_thickness","0.2"],["fill","yes",["thermal_gap","0.5"],["thermal_bridge_width","0.5"],["island_removal_mode","0"]]],
    },
  ],
}
