// Reference only — not a drop-in file. Shows how PickupScheduler is wired
// into AIM's Contact page; adapt the surrounding markup/copy to KH's own
// contact page rather than copying this wholesale (MapEmbed, ContactForm,
// etc. are separate AIM components not included in this package).
//
// Two things worth keeping as-is:
//  1. The hash-scroll effect, so a "Schedule Pickup" link from anywhere on
//     the site (navbar, hero, etc.) auto-scrolls to the widget on load.
//  2. The `id="schedule-pickup"` on the wrapping section — SCHEDULE_PICKUP_URL
//     ('/contact#schedule-pickup') depends on this exact id existing.

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import PickupScheduler from '../components/contact/PickupScheduler'

export default function ContactPagePickupSection() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash !== '#schedule-pickup') return
    const el = document.getElementById('schedule-pickup')
    if (!el) return
    requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [location])

  return (
    <section id="schedule-pickup" className="mx-auto mt-16 max-w-6xl scroll-mt-32 px-4 text-center">
      <img src="/brand/kh-dental-logo.png" alt="Kings Highway Dental Laboratory" className="mx-auto mb-5 h-16 w-auto" />
      <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold text-kh-deep">
        Schedule a pickup
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-slate">
        Tell us where and when — our team will confirm your pickup window.
      </p>
      <div className="mt-8">
        <PickupScheduler />
      </div>
    </section>
  )
}
