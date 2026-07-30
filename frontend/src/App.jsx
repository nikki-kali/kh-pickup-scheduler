// Dev-only harness — renders the reference Contact page wiring
// (pages/ContactPickupSection.example.jsx) so PickupScheduler/PickupCalendar
// can be exercised in a real browser against the local backend.
import ContactPickupSection from '../pages/ContactPickupSection.example.jsx'

export default function App() {
  return (
    <main className="min-h-screen pb-24">
      <ContactPickupSection />
    </main>
  )
}
