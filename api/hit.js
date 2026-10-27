/* Visitor count: website ke har page se ek chhota "hit" yahan aata hai.
   Vercel batata hai visitor kis shehar/state se hai; phir ye Google Script (Visits sheet) ko bhej deta hai. */
const fs = require("fs");
const path = require("path");

let SCRIPT = "";
try {   // config.js wala hi Google Script link
  const src = fs.readFileSync(path.join(__dirname, "..", "config.js"), "utf8");
  SCRIPT = (/orderUrl:\s*"([^"]+)"/.exec(src) || [])[1] || "";
} catch (e) {}

const IN_STATES = { AN:"Andaman & Nicobar", AP:"Andhra Pradesh", AR:"Arunachal Pradesh", AS:"Assam", BR:"Bihar", CH:"Chandigarh", CT:"Chhattisgarh", CG:"Chhattisgarh",
  DN:"Dadra & Nagar Haveli", DD:"Daman & Diu", DL:"Delhi", GA:"Goa", GJ:"Gujarat", HR:"Haryana", HP:"Himachal Pradesh", JK:"Jammu & Kashmir", JH:"Jharkhand",
  KA:"Karnataka", KL:"Kerala", LA:"Ladakh", LD:"Lakshadweep", MP:"Madhya Pradesh", MH:"Maharashtra", MN:"Manipur", ML:"Meghalaya", MZ:"Mizoram", NL:"Nagaland",
  OR:"Odisha", OD:"Odisha", PY:"Puducherry", PB:"Punjab", RJ:"Rajasthan", SK:"Sikkim", TN:"Tamil Nadu", TG:"Telangana", TS:"Telangana", TR:"Tripura",
  UP:"Uttar Pradesh", UT:"Uttarakhand", UK:"Uttarakhand", WB:"West Bengal" };
const dec = v => { try { return decodeURIComponent(String(v || "")); } catch (e) { return String(v || ""); } };
function agent(ua){
  ua = String(ua || "");
  const device = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Mobile" : "Computer";
  const browser = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iPhone / iPad" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Other";
  return { device, browser, os };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST" || !SCRIPT) return res.status(204).end();
  const ua = req.headers["user-agent"] || "";
  if (/bot|crawl|spider|preview|vercel|headless|lighthouse/i.test(ua)) return res.status(204).end();   // Google bot waghera gine nahi
  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const h = req.headers;
  const body = { action: "visit", v: b.v, p: b.p, r: b.r, country: h["x-vercel-ip-country"] || "", state: (h["x-vercel-ip-country"] === "IN" && IN_STATES[h["x-vercel-ip-country-region"]]) || dec(h["x-vercel-ip-country-region"]),
    city: dec(h["x-vercel-ip-city"]), ...agent(ua) };
  try { await fetch(SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) }); } catch (e) {}
  res.status(204).end();
};
