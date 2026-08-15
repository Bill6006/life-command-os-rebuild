declare const brand: unique symbol

/**
 * A nominal type over a primitive.
 *
 * The canonical plan repeatedly turns on distinctions that a structural type
 * system erases: a week identifier is not an instant (section 15), a record id
 * is not an entity id (section 13.3). Branding makes those confusions a
 * compile error rather than a defect discovered on a phone months later.
 */
export type Branded<T, B extends string> = T & { readonly [brand]: B }
