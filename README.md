# Arduino Lab

Lessons and the simulator stay as pages. Accounts, XP, streaks, certificates, classes, and payments are stored by the API in `server/` using SQLite.

## Run locally

Node.js 22 or newer is required.

```bash
npm install --prefix server
npm start --prefix server
```

Open `http://localhost:8080`.

## Deploy

```bash
docker compose up --build
```

The database lives in the `lab-data` volume. Change `BILLING_WEBHOOK_SECRET` before you accept real payments. After an invoice is created, confirm it with:

```bash
curl -X POST http://localhost:8080/api/billing/confirm \
  -H "Content-Type: application/json" \
  -H "x-billing-secret: change-me" \
  -d "{\"reference\":\"LAB-...\"}"
```

Start the server with `BILLING_DEMO=1` if you want checkout to activate a plan immediately. Do not set that variable in production.

## Plans

- **Free:** lessons, quizzes, the simulator, XP, and streaks.
- **Plus:** official certificates and a highlighted name on the leaderboard. 8 USD per month.
- **Classroom:** teacher tools, up to 20 classes, 40 students per class, and official certificates. 29 USD per month. A confirmed payment turns the account into a teacher.

A free teacher account can open one trial class.
