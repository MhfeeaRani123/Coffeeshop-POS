# Backend configuration

Set these environment variables before starting the backend:

- `MONGO_URI`: the MongoDB connection string for the database.
- `ADMIN_PASSWORD`: the password administrators use to sign in to Manage Menu.
- `ADMIN_TOKEN_SECRET`: a private random secret of at least 32 characters used to sign admin sessions.

For local development, put them in `backend/.env` (or configure them in the hosting environment). Keep that file private and out of source control. Admin sessions expire after eight hours. Product creation, updates/restocking, and deletion require a valid admin session; product listing and checkout remain available to staff.

From the repository root, start the API with `npm run start:backend` and start the POS interface in a second terminal with `npm start`. Run the frontend production build with `npm run build` and the frontend tests with `npm test`.
