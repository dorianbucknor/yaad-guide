# Payments follow-up

Draft emails to the payment providers we are considering. Each asks the same core questions so the answers can be compared side by side. The wording describes what we need and does not name the product.

**Before sending**
- Take each address from the provider's own site or your account dashboard. None of the addresses below is confirmed.
- Fill in the bracketed fields.
- Record each reply in the comparison table at the end.

## What we need (for reference)

- Charges in JMD and USD, per listing.
- Payment only after a provider accepts (authorize now, capture later), or a payment link sent after acceptance.
- Full and partial refunds in the original currency.
- Funds held, then paid to many independent local providers after the service, in batches.
- Webhooks for payment, refund and payout status.

---

## 1. WiPay Jamaica

**To:** [WiPay Jamaica support address, confirm on wipaycaribbean.com/support or in the account dashboard]
**Subject:** Merchant account questions: JMD and USD charges, settlement, and vendor payouts

Hello WiPay Jamaica team,

We are building an online marketplace for travel services in Jamaica. Travelers pay through the platform, and independent local businesses (drivers, accommodations, attractions) provide the services. We plan to use WiPay Jamaica for card payments and would like to confirm a few things before we build the integration.

**What we need to support**
- Customers are charged in either USD or JMD, depending on the listing.
- Payments are taken at checkout, and some are only charged after a provider accepts the booking.
- Full and partial refunds, in the same currency as the original charge.
- Funds are held, then paid out to the local service providers after the service is delivered. Payout timing varies by service type (immediately, after the service, or 24 hours after check-in).

**Currencies and settlement**
1. Can one merchant account accept both JMD and USD charges? Does each currency settle in its own currency, into a matching JMD or USD business bank account?
2. Is any currency conversion applied between JMD and USD, and if so, at what rate and fee?
3. What is the actual settlement time for each currency?
4. Which currencies does our account's Supported Currencies endpoint return? Does the Jamaica platform support BBD, XCD, GYD or TTD for Jamaican merchants?

**Fees**
5. Can the processing fee be set per transaction as customer-pays, shared, or merchant-absorbed? Are there fees for refunds or chargebacks, apart from the withdrawal fee of J$500 or US$11?

**Payouts and split payments**
6. Do you support split payments or marketplace payouts, similar to Stripe Connect? That would mean a single customer payment is split between the platform and one or more connected provider accounts, each with its own onboarding and verification.
7. If not, can the withdrawals API (WAPI) pay out to third-party bank accounts, meaning providers' own accounts in their own names? Are there limits on the number or size of withdrawals, approval requirements, or fees per payout?
8. Is there a way to hold funds until a condition is met, for example authorize now and capture later?

**Operations**
9. Do you offer webhooks for payment, refund and withdrawal status? Is the sandbox equivalent to live for refunds and withdrawals?
10. Are there any requirements or restrictions for marketplaces that collect payments on behalf of other businesses?

Thank you. Please let us know if a call would be easier.

Kind regards,
[Name]
[Business name and contact details]

---

## 2. NCB eCommerce (PowerTranz gateway)

**To:** [NCB eCommerce / merchant services contact, confirm on jncb.com/ecommerce]
**Subject:** eCommerce merchant account enquiry: JMD and USD card payments for a marketplace

Hello NCB eCommerce team,

We are building an online marketplace for travel services in Jamaica. Travelers pay by card, and independent local businesses (drivers, accommodations, attractions) provide the services. We are considering an NCB eCommerce merchant account with the Powertranz gateway and would like to confirm a few things before applying.

**What we need to support**
- Customers are charged in either USD or JMD, depending on the listing.
- Payments are taken at checkout, and some are only charged after a provider accepts the booking.
- Full and partial refunds, in the same currency as the original charge.
- Funds are held, then paid to many independent local providers after the service is delivered, in batches.

**Currencies and settlement**
1. Can a single merchant account process both JMD and USD card payments? Do the two settle into separate NCB JMD and USD accounts, and is any conversion applied?
2. What is the typical settlement time for each currency? Your page mentions as fast as 24 hours; is that standard?
3. Is a separate account needed for each currency?

**Fees and eligibility**
4. What are the rates and fees: per-transaction rate, monthly or setup fees, refund fees and chargeback fees?
5. What are the eligibility requirements and the onboarding timeline? Does a marketplace that collects payments on behalf of other businesses need special approval or a different agreement?

**Marketplace features**
6. Do you support split payments or marketplace payouts, so a payment can be divided between the platform and connected provider accounts? If not, are there restrictions on holding funds and paying third parties from our own account?
7. Can a payment be authorized now and captured later (for example, within 7 days)?
8. Can the gateway send us webhooks for payment and refund status? Do you provide a sandbox?

Thank you. Please let us know if a call would be easier.

Kind regards,
[Name]
[Business name and contact details]

---

## 3. TiloPay

**To:** [TiloPay sales or support, via tilopay.com or the account dashboard]
**Subject:** Jamaica merchant eligibility, JMD and USD settlement, and marketplace payouts

Hello TiloPay team,

We are building an online marketplace for travel services in Jamaica. Travelers pay by card, and independent local businesses (drivers, accommodations, attractions) provide the services. We are evaluating TiloPay and would like to confirm a few things before we decide.

**What we need to support**
- Customers are charged in either USD or JMD, depending on the listing.
- Payments are taken at checkout, and some are only charged after a provider accepts the booking.
- Full and partial refunds, in the same currency as the original charge.
- Funds are held, then paid to many independent local providers after the service is delivered, in batches.

**Eligibility and currencies**
1. Can a business registered in Jamaica open a TiloPay merchant account?
2. Can one account accept both JMD and USD charges, and does each settle in its own currency into a matching bank account? Which Jamaican banks are supported?
3. Is any currency conversion applied, and at what rate and fee?
4. What is the settlement time for each currency?

**Fees**
5. What are your rates for Jamaica: per-transaction rate, fixed fees, refund fees and chargeback fees?

**Marketplace features**
6. Do you support split payments or marketplace payouts, similar to Stripe Connect, with a payment divided between the platform and connected provider accounts that are onboarded and verified separately? One listing describes split payments as a scenario; how does it work for Jamaica?
7. If not, are there restrictions on holding funds and paying independent providers from our own account?
8. Can a payment be authorized now and captured later?
9. Do you offer webhooks for payment and refund status, and a sandbox that behaves like live?
10. Are there requirements for marketplaces that collect payments on behalf of other businesses?

Thank you. Please let us know if a call would be easier.

Kind regards,
[Name]
[Business name and contact details]

---

## 4. Fygaro

**To:** [Fygaro sales or support, via fygaro.com or the account dashboard]
**Subject:** Jamaica merchant accounts, currencies and payouts for a marketplace

Hello Fygaro team,

We are building an online marketplace for travel services in Jamaica. Travelers pay by card, and independent local businesses (drivers, accommodations, attractions) provide the services. We are evaluating Fygaro for card payments and would like to confirm a few things first.

1. Does Fygaro offer an API for creating charges and refunds, or is it limited to payment links and hosted checkout? Is there a sandbox?
2. Can a Jamaican business accept both JMD and USD charges? What does each settle into, and is any conversion applied (your launch material mentions automatic FX)?
3. What are the settlement time and fees for Jamaica, including refund and chargeback fees?
4. Do you support split payments or marketplace payouts to independent providers? If not, are there restrictions on holding funds and paying providers ourselves?
5. Can a payment be authorized now and captured later?
6. Do you offer webhooks for payment and refund status?
7. Are there requirements or restrictions for marketplaces that collect payments on behalf of other businesses?

Thank you. Please let us know if a call would be easier.

Kind regards,
[Name]
[Business name and contact details]

---

## Comparison (fill in as replies arrive)

| Question | WiPay | NCB / Powertranz | TiloPay | Fygaro |
|---|---|---|---|---|
| Jamaican business eligible | | | | |
| JMD and USD on one account | | | | |
| Settlement currency | | | | |
| Settlement time | | | | |
| Conversion rate and fee | | | | |
| Processing rate | | | | |
| Refund and chargeback fees | | | | |
| Split or marketplace payouts | | | | |
| Third-party payouts via API | | | | |
| Authorize now, capture later | | | | |
| Webhooks and sandbox | | | | |
| Marketplace restrictions | | | | |
| Onboarding time | | | | |
