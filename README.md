# Nano Motion

A fictional premium activewear storefront for an OpenAI Solutions Engineer, Ads take-home assignment. Static HTML, CSS and browser JavaScript. No backend, real payments, customer accounts or actual waitlist registrations.

## Run locally

Serve this directory with any static HTTP server, for example:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Routes use URL fragments so direct links work on GitHub Pages under a repository subdirectory. Assets use relative paths. `.nojekyll` preserves direct static publishing.

## GitHub Pages

Publish the repository's `main` branch from `/` in **Settings → Pages → Build and deployment → Deploy from a branch**. The GitHub Pages URL is `https://<owner>.github.io/<repository>/`. No build step or secrets are required.

## Demo flow

1. Choose whether to allow measurement.
2. Shop the collection, open Pace Running Tee, select M and add one to the bag.
3. Start demo checkout, inspect the basket and place the demo order.
4. Inspect the confirmation, then refresh it. The purchase event originates only from order creation, not from rendering the confirmation.
5. Open Motion Club and submit the synthetic membership waitlist.
6. Open **Measurement** to see application calls. Expand an event to see data and options. The panel does not claim delivery, platform receipt or attribution.
7. In browser DevTools, filter Network for `bzr`. If Ads Manager is available, separately verify platform receipt. No live ad exposure is simulated.

The panel can also be opened with `?demo` before the fragment. Reset clears the demo bag, tab orders, waitlist and local log while retaining the consent choice.

## Measurement contract

Pixel ID: `JVqJHiUMphYM8rZnxaMwYm` (provided for this assignment).

| Event | Trigger | Data shape | Business role |
| --- | --- | --- | --- |
| `page_viewed` | Initial view or hash-route navigation | `contents` with page ID | Navigation context |
| `contents_viewed` | Valid product detail view | `contents` with SKU and price | Product interest |
| `items_added` | Successful bag addition or quantity increase | `contents` with only added units and value | Purchase intent |
| `checkout_started` | Opens a nonempty checkout | `contents` with current bag | Funnel progression |
| `order_created` | Successful simulated order creation | `contents` with immutable order and stable `event_id` | Primary commercial outcome |
| `lead_created` | First successful synthetic waitlist submission per tab | `customer_action`, no revenue | Separate prelaunch membership demand |

`amount` uses integer ISO 4217 minor units. The sample uses USD throughout. USD 80 is `8000`. Merchandise totals exclude tax and delivery. Each item has a unit price and quantity. Selected size is encoded in the item SKU. Only documented browser Pixel fields appear in payloads.

### Consent and resilience

The official SDK loads near the top of the head. Measurement consent is explicitly denied before `init`; a saved grant is then restored. The application does not call `measure` while consent is denied. Blocked events appear only in the local diagnostic log and are never replayed. A new view of the current screen occurs after acceptance. Withdrawal calls the SDK consent API to stop future pings and remove its measurement cookies.

No customer identifiers are manually supplied to the SDK. Checkout and waitlist use fixed synthetic contact information. There is no payment collection. The SDK's optional automatic matching behaviour is account-configured, so validate that configuration before a production rollout.

The diagnostic log is in memory. The bag and consent preference use this browser's local storage. Simulated orders and waitlist state use tab-scoped session storage. If storage is unavailable, the shopping journey still works in memory. Failure or blocking of the SDK does not block the storefront.

### Duplicate protection

Order creation synchronously disables the action, writes an immutable order record and empties the bag before navigating to confirmation. The purchase call uses a unique order `event_id`. Reloading, back navigation or repeat clicks on an empty bag cannot repeat that call. This prevents browser repeats for this static demo. Production purchase truth should come from verified backend/payment state. Adding Conversions API requires reuse of the browser `event_id` as server `id` on the same Pixel and event name.

## Production next steps

- Replace simulated order and membership actions with verified commerce and billing outcomes.
- Confirm launch market, finance-approved revenue definition and margin-aware acquisition targets.
- Integrate the production consent platform and review market-specific requirements.
- Validate actual Pixel requests and receipt before setting an eligible campaign conversion goal.
- Add consent-respecting server events using Conversions API and browser/server deduplication.
- Reconcile eligible purchase counts and values to commerce data. Monitor delivery and consent gaps.
- Add paid membership enrolment with `subscription_created` / `plan_enrollment`; evaluate renewals, cancellations and retention using billing/CRM data.
- Assess return alongside refunds, contribution margin and an appropriate incrementality design. No performance lift is claimed by this demo.

## References

- [OpenAI Measurement Pixel](https://developers.openai.com/ads/measurement-pixel)
- [OpenAI Supported Events](https://developers.openai.com/ads/supported-events)
- [OpenAI Conversions API](https://developers.openai.com/ads/conversions-api)

Product imagery and hero photography are AI-generated illustrations for this fictional brand. Specifications and prices are sample data.

## Validation

The automated browser suite checks consent initialization, size validation, USD minor-unit values, quantity changes, checkout, duplicate clicks, confirmation refresh, membership lead semantics, withdrawal, mobile overflow, and shopping with a blocked SDK.

```sh
npm install
npx playwright install chromium
npm test
```

Tests serve static files through browser request interception under a repository subdirectory and stub the SDK for deterministic contract checks. `NM_BROWSER_PATH` can select an existing Chromium executable.

The real SDK was also exercised separately: it formed the expected page, product and bag event requests. This execution environment returned empty responses for configuration and event transport, so HTTP acceptance, Ads Manager receipt and attribution remain unverified. The SDK can issue a diagnostic request while measurement consent is denied; no application shopping event is called before consent. Complete a live-host Network check after deployment and verify receipt separately in Ads Manager if available.
