# Okunland University of Nigeria: website

A static website (HTML, CSS and vanilla JavaScript) with no build step. Upload the whole folder to any static host (Netlify, Vercel, GitHub Pages, cPanel, S3, here.now) and it works.

## Pages
| File | Page |
|---|---|
| index.html | Home: hero, audience bar, welcome, animated stats, colleges, campus tour, explore campus, tabbed stories and testimonial carousel, news, events, Gazette sign-up, admissions call to action |
| academics.html | All colleges and faculties with sample programmes and a live filter and search, plus Postgraduate School, Keystone Honors Academy, academic calendar and library |
| admissions.html | Six-step how-to-apply guide, requirements and cut-offs table, how JAMB/UTME and Post-UTME scores combine, deadlines, Direct Entry and transfer, postgraduate, international applicants, FAQ accordion |
| cost-financial-aid.html | Fee table, first-year cost estimator, scholarships, NELFUND loans and work-study, how to pay, information for parents |
| campus-experience.html | Overview, holistic support, residential halls, campus safety, student involvement (SUG), athletics, events calendar |
| who-we-are.html | Timeline since 1974, Vice-Chancellor's message, mission, vision and values, leadership, accreditation, careers |
| research.html | The Institute @ OKU: research centres, patents, TETFUND projects, repository, partnerships |
| news.html | Featured story, news cards, full stories, Gazette sign-up, Gazette archive |
| contact.html | Contact details, departments directory, visit request form, OpenStreetMap embed, prospectus request |
| subscribe.html | Dedicated Gazette sign-up page. `subscribe.html?admin=1` opens the hidden admin view |
| portal.html | E-Portal hub for students, applicants, staff, alumni, partners and parents (placeholder links) |
| privacy.html, terms.html, accessibility.html, sitemap.html | Legal pages, sitemap and photo credits |

The pages were generated from Python templates. The shared header, nav and footer live in `_build/layout.py` (included in the zip; run `bash _build/build_all.sh` after fixing the paths at the top of `layout.py`). You can also edit the HTML files directly.

## Design system (v2)
- **Fonts (self-hosted in `fonts/`, SIL OFL):** **Source Serif 4** for headings and quotes. It is a transitional serif in the Fournier tradition with optical sizes, so large headlines look crisp and editorial, the way many established universities and journals set them. **Public Sans** for body text and UI. It is the US Web Design System typeface, descended from Franklin Gothic, so it reads as civic and institutional. Base body size is 18px.
- **Spacing scale:** `--s1`–`--s9` = 4, 8, 12, 16, 24, 32, 48, 64, 96px. Sections use `--section` (64–112px). Buttons are at least 54px tall with 16px × 32px padding.
- **Accent:** navy `#0A1D37` with blue `#0B6FB8` and cyan `#1BA6E0`. Gold is kept only on the crest and hero numeral. The footer and CTA are navy and blue only.
- **Faculty colours** (CSS variables `--f-*`, classes `.fac-<id>`; each text colour is at least 4.5:1 against white):
  Medicine `#B42318` · Law `#6941C6` · Agriculture `#2E7D32` · Engineering & Robotics `#B54708` · Business `#00766C` · Arts, Humanities & Social Sciences `#A11A5E` · Natural & Applied Sciences `#3E4EB8` · Education `#8A5A00` · Postgraduate `#344054`.
  Add `fac-card fac-<id>` to a card, `fac-tag fac-<id>` to a tag, or `chip fac-<id>` to a filter chip.
- **GitHub Pages:** the site root contains `.nojekyll` and only relative links, so it works from any sub-path.

## The Okunland Gazette email list

Growing the Gazette list is the site's main goal while it is being built. Sign-up points:
1. **Announcement bar** at the top of every page. On the home page it jumps to the hero form; elsewhere it links to `subscribe.html`. It can be dismissed (remembered for 7 days) and is hidden for subscribers.
2. **Hero sign-up** on the home page, directly in the hero.
3. **Slide-in** that appears after the visitor scrolls 45% of a page. It is dismissible ("No thanks" is remembered for 14 days, set by `GAZETTE_POPUP_DELAY_DAYS`), never shown to someone who has already subscribed, and not shown on `subscribe.html`.
4. Full forms on the home page, news page and `subscribe.html`, plus a compact form in the footer of every page.

**All of these forms feed ONE shared list** (the same `GAZETTE_ENDPOINT`, or the same localStorage key in demo mode). The `source` field records which form was used (`hero`, `popup`, `home`, `news`, `footer`, `subscribe`, `import`). The admin view (`subscribe.html?admin=1`) shows every sign-up together, with a per-form count. It also has **Import CSV**, which merges an older list (for example from an earlier site) into this one and skips duplicates.

The full forms have these fields:

- email (required)
- first name (optional)
- role (optional): Student, Parent, Alumni, Staff, Partner or Other
- consent checkbox (required)

Validation runs in the browser. A hidden honeypot field named `website` quietly drops bot submissions, and every form shows a success or error message.

All of the logic is in **`js/gazette.js`**. The settings at the top of that file are:

```js
var GAZETTE_ENDPOINT = '';   // where sign-ups are sent
var GAZETTE_MODE = 'json';   // 'json' | 'form' | 'supabase'
var GAZETTE_HEADERS = {};    // extra request headers (e.g. Supabase keys)
```

**Demo mode (the current setting):** while `GAZETTE_ENDPOINT` is empty, sign-ups are saved in the visitor's own browser (localStorage). Open `subscribe.html?admin=1` in that same browser to see them and export them to CSV. Demo mode is for testing only, because each visitor's sign-ups stay on their own device. Connect a real backend before launch.

Each submission sends these fields: `email, first_name, role, consent, source, submitted_at`. `source` records which form was used (home, footer, news or subscribe).

### Option A: Formspree (easiest, no code)
1. Create a free form at https://formspree.io and copy its endpoint, e.g. `https://formspree.io/f/abcdwxyz`.
2. Set `GAZETTE_ENDPOINT = 'https://formspree.io/f/abcdwxyz'` and `GAZETTE_MODE = 'json'`.
3. Sign-ups arrive by email and in the Formspree dashboard, which can export CSV or forward to Mailchimp through its integrations.

### Option B: Google Sheets (Apps Script, free)
1. Create a Google Sheet with the header row `email | first_name | role | consent | source | submitted_at`.
2. Open Extensions → Apps Script and paste:
   ```js
   function doPost(e) {
     var d = JSON.parse(e.postData.contents);
     var sh = SpreadsheetApp.getActive().getSheets()[0];
     var emails = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1)).getValues().flat();
     if (emails.indexOf(d.email) === -1) sh.appendRow([d.email, d.first_name, d.role, d.consent, d.source, d.submitted_at]);
     return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
   }
   ```
3. Deploy → New deployment → Web app. Set "Execute as" to Me and "Who has access" to Anyone. Copy the `/exec` URL.
4. Set `GAZETTE_ENDPOINT` to that URL and keep `GAZETTE_MODE = 'json'`. The script sends Apps Script requests as `text/plain` to avoid CORS errors.

### Option C: Mailchimp
Mailchimp's API key must never sit in browser code, so use one of these:
- **Simplest:** use Formspree (Option A) or Zapier/Make. Connect the form to Mailchimp's "Add/update subscriber" action.
- **Direct:** run a tiny serverless function (Netlify, Vercel or Cloudflare Workers). It receives the JSON and calls
  `POST https://<dc>.api.mailchimp.com/3.0/lists/<audience_id>/members` with `{ email_address, status: "pending", merge_fields: { FNAME: first_name }, tags: [role] }`.
  Point `GAZETTE_ENDPOINT` at the function. `status: "pending"` turns on double opt-in. If the function returns HTTP 409, the form shows "already subscribed".

### Option D: Supabase
1. Create a table:
   ```sql
   create table gazette_subscribers (
     id bigint generated always as identity primary key,
     email text unique not null,
     first_name text, role text, consent boolean default true, source text,
     created_at timestamptz default now()
   );
   alter table gazette_subscribers enable row level security;
   create policy "anon can subscribe" on gazette_subscribers for insert to anon with check (true);
   ```
2. In `js/gazette.js` set:
   ```js
   var GAZETTE_ENDPOINT = 'https://<project>.supabase.co/rest/v1/gazette_subscribers';
   var GAZETTE_MODE = 'supabase';
   var GAZETTE_HEADERS = { apikey: '<ANON_KEY>', Authorization: 'Bearer <ANON_KEY>' };
   ```
   The anon key is public by design. The insert-only policy stops visitors from reading the list. A duplicate email returns HTTP 409, which the form shows as "already subscribed".

### Before launch
- Add a CAPTCHA (e.g. Cloudflare Turnstile) or rate limiting on the endpoint if spam becomes a problem.
- Send a welcome or double opt-in email and include an unsubscribe link in every issue. The Privacy Policy page (Nigeria Data Protection Act 2023) promises both.

## Other forms
The visit request, prospectus request and repository search forms are demo forms marked `data-demo`. They validate input and show a confirmation but send nothing. Point them at Formspree or a similar service the same way as the Gazette form.

## Content notes
- Contact details, address, stats, testimonials and names were taken from the original Stitch design.
- Programme lists, fees, staff names, news and events are realistic placeholders. Replace them with official data before launch.
- Photos come from Wikimedia Commons under CC BY-SA 4.0 / CC BY 4.0. They show other Nigerian campuses and are credited on `sitemap.html#credits`. Replace them with OKU's own photography when it is available.
- Fonts (Lora and Inter) are self-hosted in `fonts/`. No external requests are made except the OpenStreetMap embed on the contact page.
