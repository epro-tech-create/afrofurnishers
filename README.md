# AfroFurnishers

AfroFurnishers is a furniture shop in Dar es Salaam. This website is the shop: you can look through the pieces, create an account, pay, and follow the order until the furniture arrives.

Prices are in Tanzanian shillings. You pay cash when the furniture is delivered.

## For someone buying furniture

You do not need an account to browse. You do need one to check out, so the order stays on your phone number and you can see where it is.

1. Open the shop and choose a piece. Rooms include the living room, dining room, bedroom, office, and outdoor.
2. Add it to your bag. You can also save pieces to a wishlist.
3. Create an account with your name and phone number, or sign in if you already have one.
4. At checkout, give the delivery address and area. The delivery fee is added before you confirm.
5. Confirm the order. You pay cash when the furniture arrives.
6. After you place the order you get a number such as `AFR-1004`. Keep it. The same number is on your account.

### Where an order goes

You and the workshop see the same steps:

1. **Order placed** — the order is in.
2. **Confirmed** — the workshop has accepted it.
3. **Preparing** — the pieces are being got ready.
4. **On the way** — it has left for your address.
5. **Delivered** — it has arrived.

If an order is cancelled, the line stops and says so. Open **My Orders** or the tracking page for that order number. The line moves when the workshop updates it. You do not need to refresh all day; the page checks again on its own.

### Delivery fees

The fee depends on the area you choose at checkout.

| Area | Fee |
| --- | --- |
| Kinondoni | TZS 15,000 |
| Ilala | TZS 15,000 |
| Ubungo | TZS 15,000 |
| Temeke | TZS 18,000 |
| Kigamboni | TZS 25,000 |
| Elsewhere in Tanzania | TZS 35,000 |

### Pages you can open

- **Shop** — every piece that is for sale, with price, size, and how many are left.
- **Bag and checkout** — your pieces, the delivery fee, and payment.
- **Account** — sign in, see your latest order, and sign out.
- **My Orders** — every order on this phone number.
- **Track** — one order, with the progress line and the receipt.
- **About, contact, care, and delivery** — who we are, how to reach us, and how to look after the furniture.

Call **+255 692 009 222** if you want advice on size, style, or budget before you buy.

## For someone running the shop

The workshop uses the same website, at `/admin`. That page asks for the admin password before anything else opens. Customers never see it.

From there you can:

- See today's revenue, orders, visits, and pieces that are running low.
- Record a sale at the counter. Stock goes down, delivery is added, and the customer can track that sale if their phone matches an account.
- Move an order along the same five steps the customer sees. Mark it paid, message them on WhatsApp, or cancel it and put the stock back.
- Keep the catalogue: add a piece, change the price, or hide it from the shop.
- Look up customers.
- Download a sales report, a stock report, or both together.
- See which pages people visit.

Sales and orders are shown 15 at a time, so a long list stays easy to read. Search still looks through all of them.

## Running it on your computer

You need Node.js.

```bash
npm install
```

Copy `.env.example` to `.env.local` and set your own admin password and a long random string for `ADMIN_SECRET`. Do not commit `.env.local`, and do not share that password.

```bash
npm run dev
```

The shop opens at [http://localhost:4173](http://localhost:4173). The workshop page is [http://localhost:4173/admin](http://localhost:4173/admin).

`npm run build` then `npm start` runs the same site for real use, still on port 4173.

Orders, accounts, stock, and visits are stored in `data/shop-db.json` on the machine that runs the site. That file is not in this repository, because it holds customer names, phone numbers, and passwords. A new copy of the site starts with the sample catalogue and creates that file when someone uses it.
