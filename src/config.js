export const ASSET_CONFIG = {
  images: {
    phone: "/assets/images/call-record.png",
    tent: "/assets/images/redacted-shelter.png",
    register: "/assets/images/registration-file.png",
    gardenia: "/assets/images/unrecorded-smell.png",
    wateringCan: "/assets/images/labor-tool.png",
    soil: "/assets/images/care-grid.png",
    floor: "/assets/images/house_base.png"
  },
  audio: {
    phone: "/assets/audio/phone_line_loop.wav",
    tent: "/assets/audio/cloth_redaction.wav",
    register: "/assets/audio/registration_process.wav",
    gardenia: "/assets/audio/unrecorded_smell.wav",
    watering: "/assets/audio/water_hold_loop.wav",
    soil: "/assets/audio/water_damage.wav",
    blackout: "/assets/audio/final_report_process.wav",
    dryClick: "/assets/audio/dry_click.wav",
    archiveReject: "/assets/audio/archive_reject.wav",
    roomTone: "/assets/audio/archive_room_tone.wav"
  },
  placeholders: {
    phone: { color: "#c94848", label: "CALL RECORD" },
    tent: { color: "#d7d0bf", label: "REDACTED SHELTER" },
    register: { color: "#efe8d3", label: "REGISTRATION FILE" },
    gardenia: { color: "#e7ead6", label: "UNRECORDED SMELL" },
    wateringCan: { color: "#7893a0", label: "LABOR TOOL" },
    soil: { color: "#4b4f46", label: "CARE GRID" },
    floor: { color: "#20242a", label: "ARCHIVE BASE" }
  }
};

export const VISUAL_CONSTANTS = {
  worldHeight: 10,
  fillDurationMs: 8000,
  floorSize: [12.62, 7.1],
  frameSafeMargin: 0.8
};

export const OBJECT_DEFINITIONS = [
  { key: "phone", asset: "phone", position: [-2.48, 0.62, 0.4], size: [2.85, 1.95], rotation: -0.05 },
  { key: "tent", asset: "tent", position: [3.12, -0.22, 0.42], size: [2.25, 1.65], rotation: 0.02 },
  { key: "register", asset: "register", position: [0.34, 1.48, 0.44], size: [2.58, 3.76], rotation: -0.08 },
  { key: "gardenia", asset: "gardenia", position: [4.78, -0.16, 0.46], size: [1.72, 1.58], rotation: 0.04 },
  { key: "wateringCan", asset: "wateringCan", position: [1.9, -2.22, 0.48], size: [1.34, 0.94], rotation: -0.05 },
  { key: "soil", asset: "soil", soilId: "soil-a", position: [0.08, -1.48, 0.36], size: [1.2, 0.66], rotation: 0.04 },
  { key: "soil", asset: "soil", soilId: "soil-b", position: [1.28, -1.52, 0.37], size: [1.16, 0.66], rotation: -0.05 },
  { key: "soil", asset: "soil", soilId: "soil-c", position: [0.68, -2.22, 0.38], size: [1.2, 0.66], rotation: 0.05 }
];

export const MEMORY_FRAGMENTS = {
  phone: [
    { perspective: "child", text: "没有声音了。通话记录仍然生成。 / No more sound. The call record still exists." },
    { perspective: "parent", text: "不要接，不要问，不要让今天变成证据。 / Do not answer. Do not ask. Do not let today become evidence." },
    { perspective: "grandparent", text: "断开的波形被归档为：帮助失败。 / The cut waveform is filed as: help failed." }
  ],
  tent: [
    { perspective: "child", text: "临时遮蔽被标注为住所，但没有登记地址。 / Temporary shelter is labeled home, but has no registered address." },
    { perspective: "parent", text: "孩子还小，被系统归入“暂不告知”。 / The child is young, filed under: not yet informed." },
    { perspective: "grandparent", text: "这一栏被遮住了，仍然要求签名。 / This field is redacted and still requires a signature." }
  ],
  register: [
    { perspective: "child", text: "名字被红线穿过去，仍然要回答在场。 / A red line crossed the name; it still had to answer." },
    { perspective: "parent", text: "纸上写得清楚，生活却不肯照着排队。 / The paper was clear. Life refused the order." },
    { perspective: "grandparent", text: "一本册子可以装下全家，也可以漏掉一个人。 / One booklet can hold a family and lose someone." }
  ],
  gardenia: [
    { perspective: "child", text: "气味没有字段，只能被误放进备注。 / Smell has no field, so it is misfiled as a note." },
    { perspective: "parent", text: "未记录的东西不等于没有发生。 / Unrecorded does not mean it did not happen." },
    { perspective: "grandparent", text: "该项无法分类：纪念、掩盖、还是证物。 / Unresolved category: memorial, concealment, or evidence." }
  ],
  wateringCan: [
    { perspective: "child", text: "必须一直按住，松手就从头来过。 / Keep holding. Let go and it starts again." },
    { perspective: "parent", text: "照料被量成八秒，像一项行政流程。 / Care is measured into eight seconds, like an administrative process." },
    { perspective: "grandparent", text: "劳动被记录，哀悼没有对应栏目。 / Labor is recorded; mourning has no matching field." }
  ],
  soil: [
    { perspective: "child", text: "水迹扩散，表格仍要求单选。 / The water mark spreads; the form still requires one choice." },
    { perspective: "parent", text: "现在少了一个人。菜还是会长。 / Now there is one fewer. The greens will grow anyway." },
    { perspective: "grandparent", text: "已经没有了。系统继续要求补全分类。 / It’s already gone. The system still requests a complete category." }
  ]
};
