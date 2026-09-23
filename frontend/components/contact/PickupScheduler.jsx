import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MagneticButton from '../MagneticButton' // KH's own magnetic-button primitive, or swap for a plain <button>
import PickupCalendar from './PickupCalendar'
import {
  CONTACT,
  EASE_CONFIDENT,
  VERIFY_EMAIL_CONFIRM_API,
  VERIFY_EMAIL_REQUEST_API,
  WEB_LEADS_API,
} from '../../lib/constants'

// NOTE: every `kh-teal` / `kh-deep` / `teal-mist` class below is a
// placeholder for KH's real theme tokens (see lib/constants.snippet.js and
// KH's own Tailwind @theme block) — swap to match KH's actual palette.

const TIME_WINDOWS = ['Morning (8–11 AM)', 'Midday (11 AM–2 PM)', 'Afternoon (2–5 PM)']
const RECURRING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

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
  isRecurring: false,
  recurringDays: [],
  caseCount: '',
  instructions: '',
  agreeTerms: false,
  verificationToken: null,
  // honeypot — real visitors never see or fill this field
  company: '',
}

const EMPTY_VERIFY = { status: 'idle', code: '', error: '', verifiedFor: '' }

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// Sorts selected recurring days into Mon..Fri order regardless of click order.
function sortRecurringDays(days) {
  return RECURRING_DAYS.filter((d) => days.includes(d))
}

function isSameDayCutoff(dateStr) {
  if (!dateStr) return false
  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return dateStr === todayKey && now.getHours() >= 11
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
    if (form.isRecurring && form.recurringDays.length === 0) {
      errors.recurringDays = 'Please select at least one recurring day.'
    }
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
  const [verify, setVerify] = useState(EMPTY_VERIFY) // status: idle | checking | code_required | confirming

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [field]: value }))
  }
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }))

  const toggleRecurringDay = (day) => {
    setForm((f) => ({
      ...f,
      recurringDays: f.recurringDays.includes(day)
        ? f.recurringDays.filter((d) => d !== day)
        : [...f.recurringDays, day],
    }))
  }

  const advance = () => {
    setDirection(1)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goNext = async () => {
    const stepErrs = stepErrors(step, form)
    setErrors(stepErrs)
    if (Object.keys(stepErrs).length > 0) return

    // Email verification gate — fires once per distinct email as the user
    // leaves the Practice step, not on every keystroke.
    if (step === 0 && verify.verifiedFor !== form.contactEmail) {
      setVerify((v) => ({ ...v, status: 'checking', error: '' }))
      try {
        const res = await fetch(VERIFY_EMAIL_REQUEST_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.contactEmail }),
        })
        if (!res.ok) throw new Error('verify-email/request failed')
        const data = await res.json()
        if (data.required) {
          setVerify({ status: 'code_required', code: '', error: '', verifiedFor: '' })
          return
        }
        setVerify({ status: 'idle', code: '', error: '', verifiedFor: form.contactEmail })
      } catch {
        setVerify((v) => ({
          ...v,
          status: 'idle',
          error: "We couldn't check your email right now. Please try again.",
        }))
        return
      }
    }

    advance()
  }

  const confirmVerificationCode = async () => {
    if (!verify.code.trim()) {
      setVerify((v) => ({ ...v, error: 'Please enter the 6-digit code.' }))
      return
    }
    setVerify((v) => ({ ...v, status: 'confirming', error: '' }))
    try {
      const res = await fetch(VERIFY_EMAIL_CONFIRM_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.contactEmail, code: verify.code.trim() }),
      })
      if (!res.ok) throw new Error('verify-email/confirm failed')
      const data = await res.json()
      setForm((f) => ({ ...f, verificationToken: data.token }))
      setVerify({ status: 'idle', code: '', error: '', verifiedFor: form.contactEmail })
      advance()
    } catch {
      setVerify((v) => ({ ...v, status: 'code_required', error: "That code didn't work. Please check it and try again." }))
    }
  }

  const editVerificationEmail = () => setVerify(EMPTY_VERIFY)

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
    const recurringDays = sortRecurringDays(form.recurringDays)
    const message = [
      `Pickup address: ${form.pickupAddress}`,
      `Preferred date: ${form.pickupDate}`,
      `Preferred time window: ${form.pickupWindow}`,
      ...(form.isRecurring
        ? [`Recurring pickup requested — days: ${recurringDays.join(', ')} (call to confirm standing schedule with courier)`]
        : []),
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
          brand: 'Kings Highway',
          message,
          pickupAddress: form.pickupAddress,
          pickupDate: form.pickupDate,
          pickupWindow: form.pickupWindow,
          isRecurring: form.isRecurring,
          recurringDays,
          caseCount: form.caseCount,
          instructions: form.instructions,
          verificationToken: form.verificationToken,
          company: form.company,
        }),
      })
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}))
        if (data.requiresVerification) {
          setForm((f) => ({ ...f, verificationToken: null }))
          setVerify({ ...EMPTY_VERIFY, error: 'Please verify your email again to submit your pickup request.' })
          setDirection(-1)
          setStep(0)
          setStatus('idle')
          return
        }
      }
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
            setVerify(EMPTY_VERIFY)
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
              {step === 0 &&
                (verify.status === 'code_required' || verify.status === 'confirming' ? (
                  <div className="flex flex-col gap-4 text-left">
                    <div>
                      <p className="text-sm font-medium text-ink">Verify your email</p>
                      <p className="mt-1 text-sm text-slate">
                        We&rsquo;ve sent a 6-digit code to{' '}
                        <span className="font-medium text-ink">{form.contactEmail}</span>. Enter it below to
                        continue.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="verifyCode" className="mb-1.5 block text-sm font-medium text-ink">
                        Verification code*
                      </label>
                      <input
                        id="verifyCode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={verify.code}
                        onChange={(e) =>
                          setVerify((v) => ({ ...v, code: e.target.value.replace(/\D/g, ''), error: '' }))
                        }
                        placeholder="123456"
                        className={`${inputClass} max-w-[160px] tracking-[0.3em]`}
                      />
                      {verify.error && <p className="mt-1 text-xs text-red-600">{verify.error}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={editVerificationEmail}
                      className="self-start text-xs font-medium text-kh-deep underline underline-offset-2 hover:text-kh-teal"
                    >
                      Wrong email? Edit it
                    </button>
                  </div>
                ) : (
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
                    {verify.error && <p className="text-xs text-red-600">{verify.error}</p>}
                  </div>
                ))}

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
                  {isSameDayCutoff(form.pickupDate) && (
                    <p className="mt-2 text-xs text-slate">
                      Same-day requests after 11:00 AM are typically scheduled for the next business day —
                      we&rsquo;ll confirm the actual pickup date with you.
                    </p>
                  )}

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

                  <div className="mt-6">
                    <label className="flex items-start gap-2.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={form.isRecurring}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setForm((f) => ({ ...f, isRecurring: checked, recurringDays: checked ? f.recurringDays : [] }))
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-kh-teal"
                      />
                      This is a recurring pickup (same practice, regular schedule)
                    </label>

                    {form.isRecurring && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          {RECURRING_DAYS.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleRecurringDay(day)}
                              className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                                form.recurringDays.includes(day)
                                  ? 'border-kh-teal bg-kh-teal text-white'
                                  : 'border-kh-teal/20 bg-white/70 text-ink hover:border-kh-teal/50'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                        {errors.recurringDays && <p className="mt-1 text-xs text-red-600">{errors.recurringDays}</p>}
                        <p className="mt-3 text-xs text-slate">
                          No need to call — submit this and we&rsquo;ll set up your recurring schedule with our
                          courier on our end, then confirm it with you by email. The date and window above are
                          just to get your first pickup started.
                        </p>
                      </div>
                    )}
                  </div>
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
                    {form.isRecurring && (
                      <>
                        <dt className="text-slate">Recurring</dt>
                        <dd className="text-ink">Yes — {sortRecurringDays(form.recurringDays).join(', ')}</dd>
                      </>
                    )}
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
            <MagneticButton
              as="button"
              type="button"
              onClick={step === 0 && verify.status === 'code_required' ? confirmVerificationCode : goNext}
              disabled={verify.status === 'checking' || verify.status === 'confirming'}
              className="!px-6 !py-3 text-sm disabled:opacity-60"
            >
              {verify.status === 'checking'
                ? 'Checking…'
                : verify.status === 'confirming'
                  ? 'Verifying…'
                  : step === 0 && verify.status === 'code_required'
                    ? 'Verify & Continue'
                    : 'Continue'}
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
