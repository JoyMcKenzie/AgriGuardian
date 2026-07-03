/* AgriGuardian: risk scoring and demo devices */
function getRiskData() {
  return {
    "John Deere": { support: "Supported", cve: 0, notes: t('noteJohnDeere') },
    "Valley Irrigation": { support: "Supported", cve: 1, notes: t('noteValley') },
    "Hog Slat": { support: "Limited", cve: 3, notes: t('noteHogSlat') },
    "DeLaval": { support: "Limited", cve: 2, notes: t('noteDeLaval') },
    "Trimble": { support: "Supported", cve: 0, notes: t('noteTrimble') },
    "DJI": { support: "Supported", cve: 0, notes: t('noteDJI') },
    "Arable": { support: "Supported", cve: 0, notes: t('noteArable') },
    "Other": { support: "Unknown", cve: 1, notes: t('noteOther') }
  };
}

function getRisk(brand, pw, healthStatus) {
  const d = getRiskData()[brand] || getRiskData()["Other"];
  if (d.support === "Limited" && pw === "no") return "red";
  if (d.cve >= 1 || pw === "no") return "yellow";
  if (d.support === "Unknown") return "yellow";
  if (healthStatus && healthStatus.includes("I update it myself")) return "yellow";
  if (healthStatus && (healthStatus.includes("No updates available") || healthStatus.includes("Sin actualizaciones"))) return "yellow";
  return "green";
}

function translateLocation(loc) {
  const m = {'North field':t('locationNorthField'),'South field':t('locationSouthField'),'East field':t('locationEastField'),'West field':t('locationWestField'),'Main house':t('locationMainHouse'),'Grain bins':t('locationGrainBins'),'Dairy barn':t('locationDairyBarn'),'Machine shed':t('locationMachineShed'),'Barn':t('locationBarn'),'Pasture':t('locationPasture')};
  return m[loc] || loc;
}
function translateDeviceType(type) {
  const m = {'Irrigation controller':t('typeIrrigation'),'Livestock monitor':t('typeLivestock'),'Soil sensor':t('typeSoil'),'Feed system':t('typeFeed'),'Barn ventilation controller':t('typeBarnVent'),'Network gateway':t('typeNetGateway'),'GPS / guidance system':t('typeGPS'),'Automation controller':t('typeAutomation'),'Robotic milker':t('typeRoboticMilker'),'Weather station':t('typeWeather'),'Drone':t('typeDrone')};
  return m[type] || type;
}
function getRiskLabel(r, resolved) {
  if (resolved) return t('lookingGood');
  return r === "red" ? t('actNowBadge') : r === "yellow" ? t('takeAction') : t('lookingGood');
}

function getRiskWhy(brand, pw, risk) {
  const d = getRiskData()[brand] || getRiskData()["Other"];
  let parts = [];
  if (pw === "no") parts.push(t('riskWhyNoPw'));
  if (d.cve >= 1) parts.push((d.cve === 1 ? t('riskWhyCve1') : t('riskWhyCve')).replace('{n}', d.cve));
  if (d.support === "Limited") parts.push(t('riskWhyLimited'));
  if (d.support === "Unknown") parts.push(t('riskWhyUnknown'));
  if (parts.length === 0) parts.push(d.notes);
  return parts.join(" ");
}

function getRiskAction(risk, pw, brand) {
  if (risk === "red") return t("recActionRed");
  if (risk === "yellow" && pw === "no") return t("recActionYellowNoPw");
  if (risk === "yellow") return t("recActionYellow");
  return t("recActionGreen");
}

let devices = [
  { id: 1, addedDate: "Jan 15, 2026", flaggedDate: "Jan 15, 2026", contactNotes: "Dealer: Hog Slat Inc — 800-949-4647\nInstalled: Oct 2021\nService contract active", brand: "Hog Slat", type: "Barn ventilation controller", label: "Main barn controller", model: "HS-VFD-4450", serial: "HS-2021-44872", mac: "A4:F5:22:1B:9C:3D", pw: "no", location: "Barn", connection: "Wi-Fi", resolved: false, resolveStatus: "", assignedTo: "", resolveNote: "", resolvedDate: "", verifiedDate: "", healthStatus: "", healthNote: "", healthDate: "", archived: false },
  { id: 2, addedDate: "Jan 15, 2026", flaggedDate: "Jan 15, 2026", contactNotes: "Dealer: DeLaval Regional — Sara Wells 555-3392\nInstalled: Mar 2022\nAnnual service due April", brand: "DeLaval", type: "Livestock monitor", label: "Dairy barn sensor", model: "DL-ALPRO-850", serial: "DL-2022-90341", mac: "B8:27:EB:44:18:7A", pw: "yes", location: "Dairy barn", connection: "Bluetooth", resolved: false, resolveStatus: "", assignedTo: "", resolveNote: "", resolvedDate: "", verifiedDate: "", healthStatus: "", healthNote: "", healthDate: "", archived: false },
  { id: 3, addedDate: "Jan 20, 2026", flaggedDate: "Jan 20, 2026", contactNotes: "Dealer: Midwest Irrigation — 555-7710\nInstalled: June 2020\nWarranty: 5yr parts", brand: "Valley Irrigation", type: "Irrigation controller", label: "North pivot", model: "Valley 8000 Series", serial: "VI-2020-77523", mac: "00:1A:2B:3C:4D:5E", pw: "yes", location: "North field", connection: "Cellular (LTE/5G)", resolved: false, resolveStatus: "", assignedTo: "", resolveNote: "", resolvedDate: "", verifiedDate: "", healthStatus: "", healthNote: "", healthDate: "", archived: false },
  { id: 4, addedDate: "Jan 20, 2026", flaggedDate: "Jan 20, 2026", contactNotes: "Dealer: Green Country JD — Tom Hill 555-2241\nPurchased: 2019\nJDLink subscription active", brand: "John Deere", type: "GPS / guidance system", label: "Tractor guidance unit", model: "StarFire 7000", serial: "JD-2019-55847", mac: "D4:F5:13:88:2C:01", pw: "yes", location: "North field", connection: "Wi-Fi", resolved: false, resolveStatus: "", assignedTo: "", resolveNote: "", resolvedDate: "", verifiedDate: "", healthStatus: "🟡 I update it myself", healthNote: "Manual update only — last update Nov 2022, over 3 years ago", healthDate: "Pre-loaded", archived: false, needsOwnerAction: false, escalation: {} },
  { id: 5, addedDate: "Feb 2, 2026", flaggedDate: "Feb 2, 2026", brand: "Siemens", type: "Automation controller", label: "Grain bin automation controller", model: "SIMATIC S7-1200", serial: "SI-2020-6ES7214", mac: "00:1B:1B:99:44:2F", pw: "no", location: "Grain bins", connection: "Ethernet (hardwired)", resolved: false, resolveStatus: "", assignedTo: "", resolveNote: "", resolvedDate: "", verifiedDate: "", healthStatus: "", healthNote: "", healthDate: "", archived: false, contactNotes: "" },
  { id: 6, addedDate: "Feb 2, 2026", flaggedDate: "Feb 2, 2026", brand: "Netgear", type: "Network gateway", label: "Office network router", model: "Nighthawk R7000", serial: "NG-2019-R7000-4821", mac: "C0:3F:0E:7D:11:88", pw: "no", location: "Main house", connection: "Ethernet (hardwired)", resolved: false, resolveStatus: "", assignedTo: "", resolveNote: "", resolvedDate: "", verifiedDate: "", healthStatus: "", healthNote: "", healthDate: "", archived: false, contactNotes: "Dealer: Rural Tech Supply — Mike Torres 555-8821\nPurchase: Jan 2019\nWarranty expired" }
];
let nextId = 7;


