# gamevolt

## Backend foundation (in progress)

The first D1 migration is in `migrations/0001_init.sql`. It creates:
- Product catalogue (prices are disabled by default until confirmed)
- Orders with server-side amount snapshots and payment/fulfillment statuses
- Payment receipt metadata (actual files belong in private R2 storage)
- An order event history for auditability

Do not enable checkout or accept transfers until the D1/R2 bindings, protected admin authentication, server-side validation, and payment verification workflow are deployed and tested.
