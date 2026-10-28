/** Decorative engineering linework, not a part drawing or a data visualization. */
export function TechnicalPart() {
  return (
    <svg
      className="technical-part"
      viewBox="0 0 440 260"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="part-grid"
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 22 0 L 0 0 0 22"
            stroke="currentColor"
            strokeOpacity=".07"
            strokeWidth=".5"
          />
        </pattern>
      </defs>
      <rect width="440" height="260" fill="url(#part-grid)" />
      <g stroke="currentColor" strokeWidth="1">
        <path d="m106 144 112-65 112 65-112 65-112-65Z" />
        <path d="m106 122 112-65 112 65-112 65-112-65Z" />
        <path d="M106 122v22m224-22v22M218 187v22" />
        <path d="m152 96 66-38 66 38-66 38-66-38Z" strokeOpacity=".45" />
        <ellipse cx="218" cy="102" rx="42" ry="24" />
        <ellipse cx="218" cy="102" rx="21" ry="12" />
        <path d="M176 102v22c0 13 19 24 42 24s42-11 42-24v-22" />
        <path d="M197 102v22c0 6 9 12 21 12s21-6 21-12v-22" />
        <path
          d="M218 22v43m0 119v52M63 124l57 33m195-112-46 27m49 108 54 31"
          strokeOpacity=".35"
          strokeDasharray="3 5"
        />
        <path
          d="m90 161 112 65m-112-65-6 4m118 61 6-4M340 138l24-14m-24-2 24-14"
          strokeOpacity=".4"
        />
        <path d="m109 101-14-8m12 8-4 7m213-12 24-14" strokeOpacity=".5" />
      </g>
      <g fill="currentColor" fontFamily="monospace" fontSize="8" opacity=".5">
        <text x="127" y="211">
          PROCESS / CAPABILITY
        </text>
        <text x="326" y="75">
          01
        </text>
        <text x="234" y="34">
          EVIDENCE
        </text>
        <text x="340" y="223">
          V0 — FOUNDATION
        </text>
      </g>
      <g stroke="#f27849" strokeWidth="2">
        <path d="M213 103h10m-5-5v10" />
        <path d="m93 91 8-5m-8 5 8 5" />
      </g>
    </svg>
  );
}
