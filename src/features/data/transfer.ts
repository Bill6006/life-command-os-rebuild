/**
 * Getting text off the phone (canonical plan section 52 — "export remains
 * reliable on phone").
 *
 * Both of these can fail, and on a phone both routinely do: the asynchronous
 * clipboard needs a secure context and a live user gesture and is refused
 * outright by some in-app browsers, and a download is a file the owner then
 * has to find. So neither is ever the only way out. Every piece of text this
 * app produces is also rendered into a selectable field on the screen, which
 * needs no permission, works in every browser, and is what the owner falls
 * back to when a copy quietly does nothing.
 *
 * That is why these return whether they worked rather than throwing: the
 * screen has to be able to say "copied" or "select the text below and copy it"
 * truthfully, and a silent failure here is a person who thinks he has his
 * backup and does not.
 */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText === undefined) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function downloadText(text: string, filename: string, type: string): boolean {
  try {
    const blob = new Blob([text], { type })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    // Appended rather than clicked detached: Firefox will not act on an
    // anchor that is not in the document.
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    // Late enough that the download has started, early enough not to leak the
    // whole history for the life of the tab.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return true
  } catch {
    return false
  }
}

/** Read a chosen file as text, or say why not. */
export async function readFile(file: File): Promise<{ text: string } | { problem: string }> {
  try {
    return { text: await file.text() }
  } catch (error) {
    return { problem: error instanceof Error ? error.message : String(error) }
  }
}
