// Stand-in for KH's real magnetic-button primitive (not part of this
// package — see PickupScheduler.jsx's import comment). Plain button/link
// styling only, no magnetic cursor-follow effect; swap for the real
// component when this is merged into KH's site.
export default function MagneticButton({ as: Tag = 'button', className = '', children, ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-full bg-kh-teal px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
