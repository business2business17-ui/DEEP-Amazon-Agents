# Amazon video specifications by placement

Source status: fetched live on **2026-11-16** from Amazon Seller Central Help and Amazon Ads ad specs. Values are marketplace-US defaults. Re-check the live uploader before a production export: Amazon changes limits, and category/account eligibility varies.

Verified sources:

- Shoppable video guide (listing video): `https://sellercentral.amazon.com/help/hub/reference/external/GUZBYWTTVULY6C9Y`
- A+ Content guide: `https://sellercentral.amazon.com/help/hub/reference/external/GLG4RQK2Y2RJADU4`
- A+ Content Basic vs Premium: `https://sellercentral.amazon.com/help/hub/reference/external/G202102930`
- Premium A+ Module Guide (PDF, v1.0): `https://go.amazonsellerservices.com/paplusmodule_EN_202205`
- Stores creative specs: `https://advertising.amazon.com/resources/ad-specs/stores`
- Sponsored Brands video: `https://advertising.amazon.com/resources/ad-specs/sponsored-brands-video`

## 0. The four placements at a glance

| Placement | File | Max size | Resolution | Duration | Aspect |
|---|---|---:|---|---|---|
| PDP listing (shoppable video) | MOV / MP4 | 5 GB | up to 1080p | 1–12 min | 16:9 or 9:16 |
| A+ Premium — full video | MP4 only | 200 MB | 960×540 min | 180 s max | player-driven |
| A+ Premium — video with text | MP4 only | 200 MB | 800×600 min | 180 s max | 4:3 block |
| Brand Store — video tile | MP4 / H.264 | not published `VERIFY_IN_UI` | 1280×640 / 640×640 / 450×320 | not published | 6:4–8:3 or 3:4–4:3 |
| Brand Store — background video | MP4 / H.264 | not published `VERIFY_IN_UI` | 1,280×640 min | 2–20 s | 6:4–8:3 (large 3:4–8:3) |
| Sponsored Brands video (PPC) | MP4 / MOV | 500 MB | 1280×720, 1920×1080, 3840×2160 | 6–45 s (≤20 recommended) | 16:9 only |

Rule: **never reuse one export across placements.** A listing video is 16:9 or 9:16 long-form; A+ Premium takes up to 200 MB and is capped at 180 s; Store tiles are short and silent; SBV is a strict 16:9 ad. Deliver separate masters.

## 1. PDP listing video ("shoppable video", carousel slot)

Upload: Seller Central → Upload and manage your product videos.

Requirements:

- Account active for more than 3 months (brand-registered or not).
- Product ASINs created and listed.
- File format: **MOV or MP4**.
- Maximum size: **5 GB**.
- Resolution: **up to 1080p**.
- Aspect ratio: **16:9 horizontal or 9:16 vertical**.
- Duration: **1–12 minutes**.
- Thumbnail: JPEG, PNG, GIF or BMP, **under 5 MB**.
- Each video must be associated with at least one ASIN.
- US–Canada shared listings sync automatically; no other marketplace sharing. Some videos may surface on shared global listings during experiments.

Quality (Amazon guidance): clear product visibility, high-quality audio, proper lighting, professional presentation, accurate product information. The video must also meet Community Guidelines.

AI disclosure (mandatory where applicable): if the video contains **photorealistic AI-generated people**, tag the file with keyword `contains-synthetic-performer` in the `dc:subject` (XMP) field using an IPTC-compatible editor. Amazon then shows a disclosure. No tag needed for real people (even AI-retouched), expressive characters, no people, or non-photorealistic people.

Production note for this skill: a 1–12 minute slot is a **product film**, not a teaser. Plan chapters: what it is (0:00–0:10), how it works, materials in macro, fit/compatibility, in-use, care. Front-load the product: the first 5 seconds decide.

## 2. A+ Basic

No video module. The Basic/Premium comparison table lists video and hotspot only for Premium. Do not promise a video block on a Basic A+ layout.

## 3. A+ Premium video modules

### 3.1. Premium full video

| Parameter | Value |
|---|---|
| Video type | **.mp4 only** (Flash unsupported) |
| Minimum resolution | **960×540** |
| Maximum file size | **200 MB** |
| Maximum length | **180 s** |
| Preview image (resting state) | **1464×600** min, png / jpg / jpeg |
| Headline | 80 characters |
| Body | 300 characters |
| Mobile | uses the desktop assets; no separate mobile video |

### 3.2. Premium video with text

| Parameter | Value |
|---|---|
| Video block | **800×600** min |
| Maximum file size | **200 MB** |
| Maximum length | **180 s** |
| Preview image | **800×600** min |
| Headline | 80 characters |
| Subheadline | 40 characters |
| Body | 500 characters |
| Video title | 50 characters |
| Video description | 200 characters |
| Mobile | uses the desktop assets |

Notes:

- Amazon's own guidance in the Module Guide: the ideal length is around **10 seconds**; a large share of viewers stop after that. Treat 180 s as a ceiling, not a target.
- Multiple video modules are allowed in Premium (up to 7 modules on the detail page, 19 templates available).
- The AI-generated-people disclosure applies to A+ video as well (`contains-synthetic-performer` in XMP `dc:subject`).
- Video is uploaded in A+ Content Manager, not in the listing video library. Separate asset, separate limits.

## 4. Brand Story

Brand Story is one module with up to 19 cards in a carousel; documented features are full-screen backgrounds, image and text cards, and links to products and Brand Stores. **No video module is documented.** Do not plan video for Brand Story without confirming in the live builder (`VERIFY_IN_UI`).

## 5. Brand Store

### 5.1. Video tile (click to play)

| Tile size | Minimum cover image | Minimum video resolution | Aspect ratio | File requirements |
|---|---|---|---|---|
| Full width | 3,000×1,500 | 1,280×640 | 6:4 to 8:3 | MP4, H.264 |
| Large | 1,500×1,500 | 640×640 | 3:4 to 4:3 | MP4, H.264 |
| Medium | 1,500×750 | 450×320 | 6:4 to 8:3 | MP4, H.264 |

- Both a video file **and** a cover image are required. The cover is the resting state before play.
- Shoppers get play/pause, volume and full screen.

### 5.2. Background video tile (autoplay, silent)

| Tile size | Minimum video resolution | Maximum height | Length | Aspect ratio |
|---|---|---|---|---|
| Full width | 1,280×640 | 1,500 px | 2–20 s | 6:4 to 8:3 |
| Large | 1,280×640 | 640 px | 2–20 s | 3:4 to 8:3 |
| Medium | 1,280×640 | 320 px | 2–20 s | 6:4 to 8:3 |

- Only the video file is required; **no cover image**.
- Autoplays and auto-repeats, muted, inline on desktop and mobile. No player controls.
- File: MP4, H.264.

### 5.3. Page limits

- Each page: up to **20 sections** total, of which a maximum of **4 background video tiles**.
- Every page has a built-in header and needs at least 1 additional content tile.
- Store video file-size ceiling is not published on the spec page: `VERIFY_IN_UI` in Store Builder. The 5 MB limit applies to images.

## 6. Sponsored Brands video (PPC)

| Parameter | Specification |
|---|---|
| Duration | 6–45 s (20 s or less highly recommended) |
| Dimensions | 1280×720, 1920×1080, or 3840×2160 |
| File size | 500 MB or less |
| Format | .MP4 or .MOV |
| Aspect ratio | **16:9, square pixel only** |
| Video codec | H.264 or H.265 |
| Profile | Main or Baseline |
| Frame rate | 23.976, 23.98, 24, 25, 29.97, 29.98 or 30 fps |
| Video bit rate | minimum 1 Mbps (4 Mbps+ recommended) |
| Scan type | Progressive |
| Audio codec | PCM, AAC or MP3 |
| Audio channels | stereo or mono |
| Audio bit rate | minimum 96 kbps |
| Audio sample rate | minimum 44.1 kHz |

Creative rules:

- Starts muted; a mute toggle sits in the lower-right corner. Silent ads show no toggle.
- **Safe area: keep text and key information out of the lower-right corner** (mute button overlay).
- No letterboxing or pillarboxing (no black, coloured or blurred bars).
- On-screen language must match the marketplace language.
- Brand name and logo belong on the end card, not in the first second.
- Amazon creative acceptance policies apply; ads are reviewed before serving.

## 7. Production matrix: one shoot, four deliverables

| Deliverable | Cut | Audio | Text on screen | Export |
|---|---|---|---|---|
| PDP listing video | 60–180 s, chaptered | yes, clean | sparse, readable | MOV/MP4, 1080p, 16:9 (or 9:16 for vertical category) |
| A+ Premium full video | 10–20 s, loopable feel | optional | headline + 1 line | MP4, 1280×720+, ≤200 MB, preview 1464×600 |
| Store video tile | 15–30 s | optional | none | MP4 H.264, per tile aspect |
| Store background video | 2–20 s, seamless loop | none | none | MP4 H.264, 1280×640+, max height per tile |
| SBV | 15–20 s | yes + music | end card CTA | MP4, 1920×1080, 16:9, ≤500 MB |

Deliver a master at the highest resolution plus one export per placement. Keep a clean version without burned-in text for reuse in non-English marketplaces.

## 8. QA checklist

- [ ] Correct placement: file matches that placement's codec, container, duration and aspect.
- [ ] Listing: MOV/MP4, ≤5 GB, ≤1080p, 1–12 min, 16:9 or 9:16, thumbnail <5 MB.
- [ ] A+ Premium: MP4 only, ≤200 MB, ≤180 s, preview image present at 1464×600 (or 800×600).
- [ ] Store: cover image present for video tiles; background video 2–20 s, silent, no cover.
- [ ] SBV: 16:9 only, no bars, lower-right corner clear, end card with brand, language = marketplace.
- [ ] No prices, discounts, reviews, ratings, superlatives, third-party logos or unverified durability claims in any frame.
- [ ] AI-generated photorealistic people tagged `contains-synthetic-performer` in XMP.
- [ ] Product on screen matches the listing exactly (model, colour, bundle).
- [ ] Mobile check: first frame readable without sound, text above the player controls.
