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
  accepts a POST from the app's origin only;
- it holds the model API key as a server-side environment secret. The key never
  reaches the browser and never appears in the bundle;
- it has **no database, no logging of request bodies, and no storage of any
  kind**. It receives, forwards, validates and replies;
- it is rate-limited per origin, and it rejects any body that does not match the
  request schema below before it forwards anything.

Nothing else lives there. It is not an application server; it is a key holder
with a validator attached.

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

## 6. The failure fallback, which is what exists today

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

**Until the owner decides, nothing here is built.** Phase 91 ships the
confirmation-first reading, and this document stays a specification.
