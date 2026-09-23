// Grouped by theme; the pickers show the groups, and the sports within them, in this order.
export const sportGroups = [
  {
    label: "Endurance",
    options: [
      { id: "triathlon", label: "Triathlon / Ultra" },
      { id: "hyrox", label: "Hyrox" },
      { id: "ocr", label: "OCR / Ninja" },
    ],
  },
  {
    label: "Movement",
    options: [
      { id: "fitness", label: "Fitness / Calisthenics" },
      { id: "parkour", label: "Parkour / 3run" },
      { id: "climbing", label: "Bouldering / Climbing" },
    ],
  },
  {
    label: "Wheels",
    options: [
      { id: "mtb", label: "MTB / Freeride" },
      { id: "bmx", label: "BMX" },
      { id: "skateboard", label: "Skateboard" },
      { id: "motorsport", label: "Motorsport" },
    ],
  },
  {
    label: "Snow",
    options: [
      { id: "snowboard", label: "Snowboard" },
      { id: "freeski", label: "Freeski" },
    ],
  },
  {
    label: "Water",
    options: [
      { id: "surf", label: "Surf" },
      { id: "kitesurf", label: "Kitesurf" },
      { id: "wakeboard", label: "Wakeboard" },
      { id: "kayak", label: "Kayak" },
    ],
  },
] as const;

export type Sport = (typeof sportGroups)[number]["options"][number]["id"];
