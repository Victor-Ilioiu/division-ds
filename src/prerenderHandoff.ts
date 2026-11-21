/**
 * Hands a pre-rendered page (scripts/prerender.mjs) over to React without a flash.
 *
 * On a pre-rendered route, #root arrives already holding the page as it renders, so crawlers read
 * real content. Mounting React straight into it would replace that markup at once with the
 * lazy route's loading state for a few hundred milliseconds before the page came back.
 *
 * Instead, the snapshot moves into a sibling that stays on screen (hidden from assistive tech: it
 * is a picture of the page, not the page), while React mounts into a #root laid out at full size
 * but invisible. Once React has drawn a heading, or after a timeout for a screen without one,
 * the snapshot goes and #root shows. On a route that wasn't pre-rendered, nothing happens.
 */
const TIMEOUT_MS = 4000

export function prepareRoot(): HTMLElement {
  const root = document.getElementById('root')!
  if (!root.firstElementChild) return root

  const snapshot = document.createElement('div')
  snapshot.setAttribute('aria-hidden', 'true')
  snapshot.setAttribute('inert', '')
  snapshot.append(...root.childNodes)
  root.before(snapshot)
  root.style.cssText = 'position:fixed;inset:0;visibility:hidden;overflow:hidden'

  let done = false
  const reveal = () => {
    if (done) return
    done = true
    observer.disconnect()
    window.clearTimeout(timer)
    snapshot.remove()
    root.style.cssText = ''
  }
  const observer = new MutationObserver(() => {
    if (root.querySelector('h1')) reveal()
  })
  observer.observe(root, { childList: true, subtree: true })
  const timer = window.setTimeout(reveal, TIMEOUT_MS)
  return root
}
