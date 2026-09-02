# The owner decision D-025 requires, written out rather than taken

**Status: not decided, not built, and not recommended here.** This document
exists because independent QA Round 8 asked for it, and because D-025 says a
change of this kind is the owner's to make and not a developer's. Nothing in the
repository has been created, wired or configured toward it. There is no service,
no account, no secret and no adapter change.

## Why the question arises

Routing Phase 91 asks the app to read two things out of a sentence the owner
types: **which life area it is about**, and **what a number in it means**. Eight
rounds of independent QA have now established that a bounded deterministic
instrument cannot do this reliably at the scale of ordinary English. Each of
seven instruments was broken in the round after it shipped, usually on both
sides of its own rule.

D-257 answers that by concluding only what is demonstrably closed and asking the
owner about the rest. That is a complete and shippable answer, and it is what
the phase now does.

**This document covers only the other path:** what it would take if the product
decides it wants broad automatic interpretation of free text instead of a
confirmation question. That is the change D-025 reserves to the owner.

## What D-025 and canonical section 18 already fix

Two constraints are not negotiable and are not re-opened here:

- **no permanent API secret in the browser.** A key shipped to the device is a
  key given away;
- **no parking the owner's life history on a server** merely because inference
  needs a network request.

Honouring both requires what section 18 calls the _smallest secure inference
service_. Everything below is the shape of that, and the cost of it.

## 1. The smallest secure service

A single endpoint, owned by the owner, holding one secret:

- one HTTPS function — a serverless function is the smallest form of it — that
  accepts a POST and nothing else;
- it holds the model API key as a server-side environment secret. The key never
  reaches the browser and never appears in the bundle;
- it has **no database, no logging of request bodies, and no storage of any
  kind**. It receives, validates, forwards, validates again and replies;
- it rejects any body that does not match the request schema below **before** it
  forwards anything.

Nothing else lives there. It is not an application server; it is a key holder
with a validator attached.

### An earlier draft of this document was wrong about the boundary

It proposed origin checking and per-origin rate limiting _as though they were an
abuse boundary_. They are not. **`Origin` is a browser courtesy, not client
authentication**: any script anywhere can send whatever `Origin` header it likes,
and CORS only stops _other web pages_ reading a reply — it stops nobody spending
the owner's key. Independent QA was right to call that out, and it is corrected
here rather than quietly.

What an abuse boundary actually needs, and what the owner is choosing between:

- **a shared secret the app holds.** Simple, and it has the same flaw as the API
  key: anything shipped to the browser can be read out of it. It raises the cost
  of casual abuse and stops nothing determined;
- **a signed short-lived token**, minted by the same function from a passphrase
  the owner enters once and the device stores. Real authentication, and the only
  option here that survives someone reading the bundle. It costs the owner one
  passphrase and the app one small sign-in path it does not currently have;
- **no authentication, and a hard spend cap instead** — see §7. Honest for a
  single-owner app, and it accepts that anyone who finds the URL can spend up to
  the cap.

**This document does not choose.** The middle option is the only one that is
actually secure; the third may be the reasonable one for an app with one user.
That trade is the owner's.

## 2. The request, which is a digest and not a history

The app already has the right shape for this: `AdvisorRequest` in
`src/intelligence/advisor.ts` is a digest precisely because _"if this ever leaves
the device, this shape is the thing that leaves"_.

For interpretation the digest would be smaller still:

```
{
  "words":   "the exact sentence the owner typed",
  "areas":   ["career", "health", "money"],
  "asking":  "which area | what a number means"
}
```

- **the sentence, and nothing around it.** No records, no history, no goals, no
  dates, no identifiers, no device or account information;
- **no private material, ever.** The privacy boundary already built for this
  phase — `mayReasonFrom`, and the `withheld` count that proves it bites — sits
  in front of the digest, so a private label cannot reach it;
- the owner's sentence is still the owner's sentence. It is personal text
  leaving the device, and that is the substance of the decision.

## 3. The response, structured and validated before use

The reply is not prose and is not trusted:

```
{
  "area":   "career" | "health" | "money" | null,
  "amount": true | false | null,
  "when":   true | false | null
}
```

- every field is validated against the closed set before anything is read;
- anything unrecognised is discarded with a note in the trace, exactly as
  `advisor.ts` already does for a nudge that does not validate;
- **the reply may not write a record.** It resolves the question the interpreter
  could not, and the existing confirmation seam still shows the owner what it
  concluded before derived evidence is written. A model that is wrong is then a
  question the owner answers, not a fact in the history.

## 4. The privacy boundary, said plainly

- what leaves the device: **one sentence the owner typed**, plus the three area
  names, per interpretation;
- what never leaves: history, records, goals, milestones, outcomes, timings,
  identifiers, and anything the privacy layer marks private;
- what is stored at the service: **nothing**;
- what the model provider retains is **their** policy, not this app's, and is
  part of what the owner is deciding. It cannot be promised away here.

### Provider, model, region and retention — the choices, not a recommendation

These are four separate decisions and the document deliberately makes none of
them:

- **provider.** Whichever is chosen, the question to ask it is the same: does the
  API tier used here train on inputs by default, and can that be turned off in
  writing? Several providers separate a consumer tier that may train from an API
  tier that does not; that separation is the thing to verify, not the brand;
- **model.** The task is three fields out of one sentence. It is a small-model
  task, and the smallest capable model is both the cheapest and the one that
  sees the least;
- **region.** If the owner is in the UK or EU, an EU-hosted endpoint keeps the
  sentence inside that jurisdiction. Not every provider offers one, and this may
  be the constraint that picks the provider;
- **retention.** Ask for zero-retention or the shortest available abuse-log
  window, in writing, and record the answer here. A thirty-day abuse log is
  common and is not nothing: it means the sentence exists on someone else's
  disk for thirty days.

### How "no request logging" is actually enforced

Saying the function does not log is not enforcement. What makes it checkable:

- the function's source is one file the owner can read end to end, and it is in
  this repository if the decision is taken, not on a console somewhere;
- **the platform's own request logging is the part that leaks**, not the code.
  Most serverless hosts log request bodies unless told otherwise, so the setting
  that disables body logging has to be named, set, and screenshotted alongside
  this document;
- a deploy check that greps the function for `console.log`, `JSON.stringify` of
  the body, and any analytics import, and fails the deploy if it finds one;
- the owner can verify the whole thing at any time by sending one request and
  looking at what the host shows. If the sentence appears in a log line, the
  policy has failed and the endpoint should be pulled.

## 5. Cost, honestly

- a serverless function at this volume is within the free tier of the common
  hosts, so the hosting cost is realistically **zero to a few pounds a month**;
- inference is one small request per interpretation — a sentence in, three
  fields out. At a small model's rates this is a **fraction of a penny per
  reading**, and an owner typing a handful of aspirations a week would not
  reach a pound a year;
- the real cost is not money. It is an account to hold, a secret to rotate, a
  dependency that can fail, and a third party seeing sentences about the owner's
  life.

## 6. What the owner would see, per request

The UX is not a detail here: it is where consent actually happens.

- **per-request consent, not a blanket setting.** The row that today says _the
  app has not decided which_ would carry one extra control: _"Ask a model to
  read this sentence?"_. Nothing is sent until it is pressed. A setting the
  owner turned on once, months ago, is not consent to send the sentence he is
  typing now;
- **the sentence is shown as it will be sent**, because that is the whole of
  what leaves. There is no second, hidden payload to disclose;
- **offline and unavailable are the same thing**: the control is absent, the
  confirmation question stands, and nothing tells the owner to try later. An app
  that degrades to asking him is not broken when the network is;
- **latency has a budget.** If a reply has not arrived in about two seconds, the
  question is put and the reply is discarded when it lands. A spinner in front
  of a question the app could already ask is a worse product than the question;
- **a wrong answer is still a question.** The reply resolves what the
  interpreter could not, and the existing confirmation row still shows it before
  anything derived is written. The model never writes a record.

## 7. Running it: keys, monitoring, incidents and a cap

The part that is easy to leave out of a sketch and impossible to leave out of a
deployment:

- **key rotation.** One key, one place, rotated on a fixed schedule and
  immediately on any suspicion. Rotation must be a single environment-variable
  change with no redeploy of the app, which is an argument for keeping the
  function this small;
- **monitoring.** Request count and error rate only — never bodies. The one
  number worth alerting on is requests per day above the owner's own plausible
  usage, because that is what a leaked endpoint looks like;
- **a hard spend cap at the provider**, set below the point where the owner
  would mind. This is the backstop that makes the "no authentication" option in
  §1 survivable at all;
- **incident response, written before it is needed.** If the endpoint is being
  abused: rotate the key, take the function down, and the app returns to the
  confirmation question with no data loss and no migration. That the fallback is
  the current product is what makes the incident cheap;
- **what an incident costs the owner's privacy.** Sentences already sent are
  already sent. Taking the endpoint down stops the next one and cannot recall
  the last one, and that asymmetry is the reason this is a decision rather than
  a setting.

## 8. The failure fallback, which is what exists today

This matters more than the rest, and it is the reason the decision is not
urgent: **if the service is absent, slow, rate-limited, erroring or returns
something that does not validate, the app does exactly what it does now.**

D-257's confirmation-first reading is the fallback. The closed readings still
conclude; the unresolved ones still ask the owner. No feature disappears when
the network does, and nothing has to be reverted to run offline. That is what
makes this an adapter change rather than an architecture change — which is what
D-025 said it would be.

## What is not decided here

Whether the owner wants a sentence about their life sent to a model provider, in
exchange for the app answering a question it would otherwise ask them. That is
the whole of it, and it is not a developer's call.

Nor are the choices this document deliberately leaves open: which provider, which
model, which region, which retention terms, and which of the three abuse
boundaries in §1. Each is written out so it can be decided; none is decided.

**And the honest summary of the trade.** Today the app asks a question in the
cases it cannot read. With a service, it would answer most of those and still
show the answer for confirmation. What is bought is fewer questions. What is
paid is that the sentence leaves the device, an account and a key exist, and
there is something that can be abused. For an app whose confirmation-first
fallback already works, that may simply not be worth it — and this document is
written so the owner can conclude that as easily as the other way.

**Until the owner decides, nothing here is built.** Phase 91 ships the
confirmation-first reading, and this document stays a specification.
