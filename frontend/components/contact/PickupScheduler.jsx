import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MagneticButton from '../MagneticButton' // KH's own magnetic-button primitive, or swap for a plain <button>
import PickupCalendar from './PickupCalendar'
import { CONTACT, EASE_CONFIDENT, WEB_LEADS_API } from '../../lib/constants'

// NOTE: every `kh-teal` / `kh-deep` / `teal-mist` class below is a
// placeholder for KH's real theme tokens (see lib/constants.snippet.js and
// KH's own Tailwind @theme block) — swap to match KH's actual palette.

const TIME_WINDOWS = ['Morning (8–11 AM)', 'Midday (11 AM–2 PM)', 'Afternoon (2–5 PM)']

const STEPS = [
  { key: 'practice', label: 'Practice' },
  { key: 'location', label: 'Location' },
  { key: 'datetime', label: 'Date & Time' },
  { key: 'details', label: 'Case Details' },
  { key: 'review', label: 'Review' },
]

const EMPTY_FORM = {
  practiceName: '',
  contactPhone: '',
  contactEmail: '',
  pickupAddress: '',
  pickupDate: '',
  pickupWindow: '',
  caseCount: '',
  instructions: '',
  agreeTerms: false,
  // honeypot — real visitors never see or fill this field
  company: '',
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const inputClass =
  'w-full rounded-xl border border-kh-teal/20 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-slate/70 transition-colors focus:border-kh-teal focus:outline-none focus:ring-2 focus:ring-kh-teal/30'

function stepErrors(step, form) {
  const errors = {}
  if (step === 0) {
    if (!form.practiceName.trim()) errors.practiceName = 'Please enter a practice or doctor name.'
    if (!form.contactPhone.trim()) errors.contactPhone = 'Please enter a phone number.'
    if (!isValidEmail(form.contactEmail)) errors.contactEmail = 'Please enter a valid email.'
  } else if (step === 1) {
    if (!form.pickupAddress.trim()) errors.pickupAddress = 'Please enter the pickup address.'
  } else if (step === 2) {
    if (!form.pickupDate) errors.pickupDate = 'Please choose a pickup date.'
    if (!form.pickupWindow) errors.pickupWindow = 'Please choose a time window.'
  } else if (step === 3) {
    if (!form.caseCount || Number(form.caseCount) < 1) errors.caseCount = 'Please enter how many cases/boxes.'
  } else if (step === 4) {
    if (!form.agreeTerms) errors.agreeTerms = 'Please agree to the terms to submit.'
  }
  return errors
}

const cardVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -24 : 24 }),
}

export default function PickupScheduler() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | success | error

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [field]: value }))
  }
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }))

  const goNext = () => {
    const stepErrs = stepErrors(step, form)
    setErrors(stepErrs)
    if (Object.keys(stepErrs).length > 0) return
    setDirection(1)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setDirection(-1)
    setErrors({})
    setStep((s) => Math.max(s - 1, 0))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.company) return // honeypot tripped — silently drop
    const finalErrors = stepErrors(4, form)
    setErrors(finalErrors)
    if (Object.keys(finalErrors).length > 0) return

    setStatus('sending')
    const message = [
      `Pickup address: ${form.pickupAddress}`,
      `Preferred date: ${form.pickupDate}`,
      `Preferred time window: ${form.pickupWindow}`,
      `Case / box count: ${form.caseCount}`,
      `Special instructions: ${form.instructions || '—'}`,
    ].join('\n')

    try {
      const res = await fetch(WEB_LEADS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.practiceName,
          practice: form.practiceName,
          email: form.contactEmail,
          phone: form.contactPhone,
          caseType: 'Schedule Pickup',
          message,
          pickupAddress: form.pickupAddress,
          pickupDate: form.pickupDate,
          pickupWindow: form.pickupWindow,
          caseCount: form.caseCount,
          instructions: form.instructions,
        }),
      })
      if (!res.ok) throw new Error('Request failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-kh-teal/15 bg-white/50 p-8 text-center sm:p-10">
        <p className="font-display text-xl font-semibold text-kh-deep">Pickup request sent.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate">
          Our team will confirm your pickup window shortly. For anything urgent, call{' '}
          <a href={CONTACT.phoneHref} className="font-medium text-kh-deep underline">
            {CONTACT.phone}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM)
            setErrors({})
            setDirection(-1)
            setStep(0)
            setStatus('idle')
          }}
          className="mt-6 text-sm font-medium text-kh-deep underline underline-offset-2 hover:text-kh-teal"
        >
          Schedule another pickup
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl text-left">
      {/* Progress */}
      <div className="mb-6 flex items-center justify-center">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-data text-[11px] font-medium transition-colors ${
                i < step
                  ? 'bg-kh-teal text-white'
                  : i === step
                    ? 'border-2 border-kh-teal text-kh-deep'
                    : 'border border-kh-teal/20 text-slate'
              }`}
              title={s.label}
            >
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 sm:w-10 ${i < step ? 'bg-kh-teal' : 'bg-kh-teal/15'}`} />
            )}
          </div>
        ))}
      </div>
      <p className="mb-5 text-center font-data text-xs uppercase tracking-widest text-slate">
        Step {step + 1} of {STEPS.length} — {STEPS[step].label}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="relative overflow-hidden rounded-2xl border border-kh-teal/15 bg-white/50 p-6 sm:p-8">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: EASE_CONFIDENT }}
            >
              {step === 0 && (
                <div className="flex flex-col gap-4 text-left">
                  <div>
                    <label htmlFor="practiceName" className="mb-1.5 block text-sm font-medium text-ink">
                      Practice / Doctor Name*
                    </label>
                    <input
                      id="practiceName"
                      type="text"
                      value={form.practiceName}
                      onChange={update('practiceName')}
                      placeholder="e.g. Dr. Jane Smith / Smith Family Dental"
                      className={inputClass}
                    />
                    {errors.practiceName && <p className="mt-1 text-xs text-red-600">{errors.practiceName}</p>}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contactPhone" className="mb-1.5 block text-sm font-medium text-ink">
                        Contact Phone*
                      </label>
                      <input
                        id="contactPhone"
                        type="tel"
                        value={form.contactPhone}
                        onChange={update('contactPhone')}
                        placeholder="(555) 123-4567"
                        className={inputClass}
                      />
                      {errors.contactPhone && <p className="mt-1 text-xs text-red-600">{errors.contactPhone}</p>}
                    </div>
                    <div>
                      <label htmlFor="contactEmail" className="mb-1.5 block text-sm font-medium text-ink">
                        Email Address*
                      </label>
                      <input
                        id="contactEmail"
                        type="email"
                        value={form.contactEmail}
                        onChange={update('contactEmail')}
                        placeholder="you@practice.com"
                        className={inputClass}
                      />
                      {errors.contactEmail && <p className="mt-1 text-xs text-red-600">{errors.contactEmail}</p>}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="text-left">
                  <label htmlFor="pickupAddress" className="mb-1.5 block text-sm font-medium text-ink">
                    Pickup Address*
                  </label>
                  <input
                    id="pickupAddress"
                    type="text"
                    value={form.pickupAddress}
                    onChange={update('pickupAddress')}
                    placeholder="Street, City, State, ZIP"
                    className={inputClass}
                  />
                  {errors.pickupAddress && <p className="mt-1 text-xs text-red-600">{errors.pickupAddress}</p>}
                </div>
              )}

              {step === 2 && (
                <div className="text-left">
                  <p className="mb-2 text-sm font-medium text-ink">Preferred Date*</p>
                  <PickupCalendar value={form.pickupDate} onChange={set('pickupDate')} />
                  {errors.pickupDate && <p className="mt-1 text-xs text-red-600">{errors.pickupDate}</p>}

                  <p className="mb-2 mt-6 text-sm font-medium text-ink">Preferred Time Window*</p>
                  <div className="flex flex-wrap gap-2">
                    {TIME_WINDOWS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => set('pickupWindow')(w)}
                        className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                          form.pickupWindow === w
                            ? 'border-kh-teal bg-kh-teal text-white'
                            : 'border-kh-teal/20 bg-white/70 text-ink hover:border-kh-teal/50'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  {errors.pickupWindow && <p className="mt-1 text-xs text-red-600">{errors.pickupWindow}</p>}
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-4 text-left">
                  <div>
                    <label htmlFor="caseCount" className="mb-1.5 block text-sm font-medium text-ink">
                      Case / Box Count*
                    </label>
                    <input
                      id="caseCount"
                      type="number"
                      min="1"
                      step="1"
                      value={form.caseCount}
                      onChange={update('caseCount')}
                      placeholder="e.g. 2"
                      className={`${inputClass} max-w-[160px]`}
                    />
                    {errors.caseCount && <p className="mt-1 text-xs text-red-600">{errors.caseCount}</p>}
                  </div>
                  <div>
                    <label htmlFor="instructions" className="mb-1.5 block text-sm font-medium text-ink">
                      Special Instructions
                    </label>
                    <textarea
                      id="instructions"
                      rows={4}
                      value={form.instructions}
                      onChange={update('instructions')}
                      placeholder="e.g. ring buzzer for Suite 4, ask for front desk, case is time-sensitive, etc."
                      className={`${inputClass} resize-y`}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="text-left">
                  <p className="mb-3 text-sm font-medium text-ink">Review your request</p>
                  <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                    <dt className="text-slate">Practice</dt>
                    <dd className="text-ink">{form.practiceName}</dd>
                    <dt className="text-slate">Phone</dt>
                    <dd className="text-ink">{form.contactPhone}</dd>
                    <dt className="text-slate">Email</dt>
                    <dd className="text-ink">{form.contactEmail}</dd>
                    <dt className="text-slate">Address</dt>
                    <dd className="text-ink">{form.pickupAddress}</dd>
                    <dt className="text-slate">Date</dt>
                    <dd className="text-ink">{form.pickupDate}</dd>
                    <dt className="text-slate">Time window</dt>
                    <dd className="text-ink">{form.pickupWindow}</dd>
                    <dt className="text-slate">Cases / boxes</dt>
                    <dd className="text-ink">{form.caseCount}</dd>
                    {form.instructions && (
                      <>
                        <dt className="text-slate">Instructions</dt>
                        <dd className="text-ink">{form.instructions}</dd>
                      </>
                    )}
                  </dl>

                  <label className="mt-5 flex items-start gap-2.5 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={form.agreeTerms}
                      onChange={update('agreeTerms')}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-kh-teal"
                    />
                    I confirm the details above are correct and pickup times are subject to
                    availability and confirmation from KH.
                  </label>
                  {errors.agreeTerms && <p className="mt-1 text-xs text-red-600">{errors.agreeTerms}</p>}

                  {/* Honeypot — hidden from real visitors, left blank */}
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={update('company')}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {status === 'error' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE_CONFIDENT }}
            className="mt-4 text-center text-sm text-red-600"
          >
            We couldn&rsquo;t submit this right now. Please call {CONTACT.phone} to schedule your pickup.
          </motion.p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-kh-deep transition-opacity disabled:opacity-0"
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <MagneticButton as="button" type="button" onClick={goNext} className="!px-6 !py-3 text-sm">
              Continue
            </MagneticButton>
          ) : (
            <MagneticButton
              as="button"
              type="submit"
              disabled={status === 'sending'}
              className="!px-6 !py-3 text-sm disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Submit Pickup Request'}
            </MagneticButton>
          )}
        </div>
      </form>
    </div>
  )
}
