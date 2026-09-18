# AfroFurnitures

A responsive furniture showroom with locally bundled internet photography, a searchable sample catalogue, product detail views, favourites, a local shopping bag, editorial pages, and downloadable custom design briefs.

Run locally: `python -m http.server 4173 --directory dist`, then open http://localhost:4173.

The site is a static HTML/CSS/JavaScript project. No dependency installation or build is required. Check JavaScript with `node --check dist/app.js`.

## Before accepting orders

Replace the three sample products and prices in `dist/app.js` with verified catalogue data and real product photography. Add confirmed business contact details and commercial policies. Connect quote submission, ordering and payments to an approved backend. The current preview does not submit requests or accept payments.

Stock photo attribution and source links are available at `#credits`. Photographs are illustrative and are not actual product inventory.

Cart and favourites are saved only in browser local storage. The design brief stays in memory while its page is open; downloads are created locally. The selected reference file is not uploaded.
