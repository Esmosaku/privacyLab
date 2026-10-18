// The PrivacyLab logo (a flask). Use this everywhere the logo appears so it stays identical.
// Size it with CSS on the parent (e.g. `.home-brand svg { width: 32px; height: 40px; }`).

export default function BrandMark() {
  return (
    <svg viewBox="0 0 32 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <path d="M10 2h12M12 2v13L3 32q-2 5 3 5h20q5 0 3-5l-9-17V2" />
      <path d="M9 26h14" />
    </svg>
  );
}
