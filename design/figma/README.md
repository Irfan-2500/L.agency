# Figma ⇄ Website (pptstore.in)

Is folder mein woh tools hain jo poori website (har public page + admin panel ka har tab) ko
**editable Figma layers** mein badalte hain, aur Figma mein kiye badlav wapas code mein laane ka tareeka.

## Figma file mein kya milega

| Figma page | Kya hai |
|---|---|
| 🌐 Website | Har page ek **Section** (jaise `01 · Home`). Section ke andar **Desktop (1440px)** aur **Phone (390px)** frame |
| 🛠 Admin panel | Login + admin ke 17 tabs (Dashboard, Analytics, Orders, Ready PPTs, Themes, Pricing, Settings …), desktop 1440px. Data sample/demo hai |

Har layer ka naam website ke HTML se aata hai (`#id` ya `tag.class`), taki Claude ko pata rahe ki
Figma ki kaunsi cheez code mein kahan hai. Text asli text layers hain (Space Grotesk / Plus Jakarta Sans / Hind / Poppins),
icons vector hain, images asli images hain. Charts (graph, donut) image ke roop mein hain.

## Design → Code (aap Figma mein badlo, Claude code kare)

1. Figma mein frame kholo aur jo chahiye badlo: text, rang, size, spacing, nayi cheez add karo, kuch hata do.
   - Nayi cheez add karo to uska layer naam samajhne layak rakho (jaise `Offer banner`).
   - Kuch samjhana ho to Figma mein **comment** daal do (C dabake). Claude comments padh sakta hai.
2. Claude ko bolo: *"Home desktop ka hero badla hai, code kar do"* (ya frame ka link bhejo:
   right-click → Copy link to selection).
3. Claude Figma frame padhta hai, use website ke current version se milata hai, sirf badli hui cheezein
   HTML/CSS mein karta hai, aur **Pull Request** banata hai. Vercel preview link par check karo, theek ho to merge.
4. Desktop aur Phone dono frame badle hon to dono ke hisaab se responsive CSS banega. Sirf desktop badla
   to phone par Claude wahi design chhoti screen ke hisaab se adjust karega.

## Code → Figma (website badli, Figma update karo)

Jab code mein badlav ho jaye, Claude yeh chala ke Figma ko phir se website jaisa kar sakta hai
(sirf woh page jo badla hai):

```bash
python3 -m http.server 8765            # repo root se, alag terminal mein
node design/figma/capture.js /tmp/cap site-index-d site-index-m     # page ka layout JSON + images
python3 design/figma/driver.py images  /tmp/cap site-index-d site-index-m   # kitni images upload karni hain
#  → Figma MCP upload_assets(count=N) → URLs ko JSON file mein → 
python3 design/figma/driver.py upload  /tmp/cap urls.json
python3 design/figma/driver.py carrier /tmp/cap carrier.svg site-index-d site-index-m
#  → carrier.svg ko upload_assets se upload karo, phir use_figma mein builder chalao (neeche)
```

`use_figma` bootstrap (carrier ki node id `CAR`, page id `PAGE`):

```js
const car = await figma.getNodeByIdAsync(CAR);
function utf8(b){/* utf-8 decode */}
const get = n => utf8(figma.base64Decode(car.findOne(x => x.name === n).findAllWithCriteria({ types: ['TEXT'] }).map(t => t.characters).join('')));
const AF = Object.getPrototypeOf(async function () {}).constructor;
const res = await (new AF('figma', 'P', get('BUILDER')))(figma, { pageId: PAGE, screens: JSON.parse(get('PAYLOAD')) });
car.remove(); return res;
```

Builder same naam ka purana frame hata kar naya bana deta hai, isliye dobara chalane par duplicate nahi banta.

### Screen ke naam

- Public: `site-<page>-d` (desktop) aur `site-<page>-m` (phone), jaise `site-ready-ppts-m`
- Admin: `admin-<tab>-d`, tab = `login dash stats report orders sales customers coupons messages reviews ppts notes cfiles themes prices menu site settings`

## Files

| File | Kaam |
|---|---|
| `serialize.js` | Browser ke andar chalta hai: DOM → layers (frame, text, image, icon), rang, gradient, border, shadow, radius |
| `capture.js` | Playwright se har page/tab kholta hai (admin demo data ke saath), animations rokta hai, `::before/::after` ko asli layer banata hai, JSON + reference screenshot save karta hai |
| `driver.py` | Images upload karna, layout + builder ko ek "carrier" SVG mein pack karna, Figma section ki jagah tay karna |
| `builder.js` | Figma ke andar chalta hai: JSON se asli Figma frames, text, images, icons banata hai |

## Dhyan rakhne wali baatein

- **Figma ka MCP limit:** Starter (free) plan par Claude ke Figma tool calls mahine mein bahut kam (≈20) milte hain.
  Poori file banane mein ~10 aur har design→code badlav mein 2–4 calls lagte hain. Roz kaam karna ho to Figma
  **Professional** plan (Full seat, ~200 calls/din) chahiye.
- Upload ke liye session ke network mein `mcp.figma.com` allowed hona chahiye (Default environment mein add hai).
- Data wale pages (Ready PPTs, admin) demo data ke saath capture hote hain, asli orders/customers Figma mein nahi jaate.
