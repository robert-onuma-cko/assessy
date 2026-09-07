// Scout — the bee mark. A BRAND MARK, not a status signal (design addendum in
// globals.css): like the sidebar wordmark, it is the one place fixed colors are
// allowed, so the hexes below are deliberate and stay out of the token system.
// The gold is honey, not `--warning` — Scout must never read as "at risk".
//
// Motion is feedback, never decoration (design.md §6): the wings are static at
// rest; `thinking` turns the flutter on and it REPLACES a spinner (that is what
// makes it feedback). prefers-reduced-motion switches the flutter off in CSS.

const BODY = '#262B3D'; // neutral slate body — quiet on both themes
const HONEY = '#F2B84B'; // Scout's gold. Fixed, brand-mark exception.
const WING = '#A6ABB8'; // muted wing membrane

export function ScoutMark({
  size = 24,
  thinking = false,
  className = '',
}: {
  size?: number;
  /** Wing-flutter as the working indicator — use INSTEAD of a spinner. */
  thinking?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={thinking ? 'Scout is working' : 'Scout'}
      className={`${thinking ? 'scout-thinking' : ''} ${className}`}
    >
      {/* Wings first, behind the body. Each flutters around its body-side root. */}
      <g className="scout-wing scout-wing-l" style={{ transformOrigin: '14px 13px' }}>
        <ellipse cx="9.5" cy="10.5" rx="6" ry="3.6" transform="rotate(-32 9.5 10.5)" fill={WING} fillOpacity="0.55" />
      </g>
      <g className="scout-wing scout-wing-r" style={{ transformOrigin: '18px 13px' }}>
        <ellipse cx="22.5" cy="10.5" rx="6" ry="3.6" transform="rotate(32 22.5 10.5)" fill={WING} fillOpacity="0.55" />
      </g>

      {/* Body: a honeycomb cell — flat-top hexagon, upright. */}
      <path
        d="M16 11 L22.2 14.6 L22.2 21.8 L16 25.4 L9.8 21.8 L9.8 14.6 Z"
        fill={BODY}
        stroke={HONEY}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Stripes, clipped to the cell. */}
      <clipPath id="scout-body">
        <path d="M16 11 L22.2 14.6 L22.2 21.8 L16 25.4 L9.8 21.8 L9.8 14.6 Z" />
      </clipPath>
      <g clipPath="url(#scout-body)">
        <rect x="8" y="15.6" width="16" height="2.3" fill={HONEY} />
        <rect x="8" y="19.7" width="16" height="2.3" fill={HONEY} />
      </g>

      {/* Head. */}
      <circle cx="16" cy="8.4" r="2.5" fill={HONEY} />
    </svg>
  );
}
