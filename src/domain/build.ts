import { coreDomains, type DomainRegistry, type LifeDomainId } from './domains'
import type { EntityRef } from './entities'
import { newRecordId, type RecordId } from './ids'
import { mostSensitive, type PrivacyClass } from './privacy'
import {
  CANONICAL_SCHEMA_VERSION,
  type CanonicalRecord,
  type Provenance,
  type RecordEnvelope,
  type RecordKind,
} from './records'
import type { Instant, TimeZoneId } from './time'

/**
 * Building well-formed records.
 *
 * Constructing a canonical record correctly is domain knowledge, not test
 * scaffolding, so it lives beside the schema rather than inside the tests.
 * Synthetic scenarios and unit tests both go through here, which means a
 * fixture cannot accidentally be shaped differently from what the app writes —
 * the failure section 60 records as "test fixtures must not accidentally make
 * hardcoded logic look correct".
 */

export type RecordOf<K extends RecordKind> = Extract<CanonicalRecord, { kind: K }>

export type PayloadOf<K extends RecordKind> = Omit<RecordOf<K>, keyof RecordEnvelope>

export interface EnvelopeInput {
  readonly occurredAt: Instant
  readonly recordedAt?: Instant
  readonly zone?: TimeZoneId
  readonly domains?: readonly LifeDomainId[]
  readonly entities?: readonly EntityRef[]
  readonly privacy?: PrivacyClass
  readonly provenance?: Provenance
  readonly supersedes?: RecordId
  readonly id?: RecordId
  readonly unrecognized?: Readonly<Record<string, unknown>>
}

export interface RecordFactoryDefaults {
  readonly zone: TimeZoneId
  readonly provenance: Provenance
  readonly nextId?: () => RecordId
  readonly domains?: DomainRegistry
}

export type RecordFactory = <K extends RecordKind>(
  kind: K,
  envelope: EnvelopeInput,
  payload: PayloadOf<K>,
) => RecordOf<K>

export function createRecordFactory(defaults: RecordFactoryDefaults): RecordFactory {
  const registry = defaults.domains ?? coreDomains
  const nextId = defaults.nextId ?? (() => newRecordId())

  return <K extends RecordKind>(
    kind: K,
    envelope: EnvelopeInput,
    payload: PayloadOf<K>,
  ): RecordOf<K> => {
    const domains = envelope.domains ?? []
    // A record inherits the most discreet class of the domains it touches, so
    // a fatherhood entry is child-family-sensitive without anyone remembering
    // to say so, and forgetting the field cannot downgrade a private one.
    const privacy =
      envelope.privacy ?? mostSensitive(domains.map((domain) => registry.defaultPrivacyFor(domain)))

    const built = {
      id: envelope.id ?? nextId(),
      schemaVersion: CANONICAL_SCHEMA_VERSION,
      kind,
      occurredAt: envelope.occurredAt,
      recordedAt: envelope.recordedAt ?? envelope.occurredAt,
      zone: envelope.zone ?? defaults.zone,
      domains,
      entities: envelope.entities ?? [],
      privacy,
      provenance: envelope.provenance ?? defaults.provenance,
      ...(envelope.supersedes === undefined ? {} : { supersedes: envelope.supersedes }),
      ...(envelope.unrecognized === undefined ? {} : { unrecognized: envelope.unrecognized }),
      ...payload,
    }

    return built as unknown as RecordOf<K>
  }
}

export const SYNTHETIC_PROVENANCE: Provenance = {
  source: 'synthetic',
  writtenBy: 'synthetic-fixture',
}

export const OWNER_PROVENANCE: Provenance = {
  source: 'owner',
  writtenBy: 'qa-lab',
}
