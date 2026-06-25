export default function Seal({ size = 80 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <rect x="6" y="6" width="88" height="88" rx="26" fill="#F2922B" />
      <circle cx="29" cy="32" r="6.5" fill="#fff" />
      <circle cx="71" cy="32" r="6.5" fill="#fff" />
      <rect x="19" y="29" width="62" height="52" rx="19" fill="#fff" />
      <circle cx="37" cy="45" r="3.4" fill="#2A1F14" />
      <circle cx="63" cy="45" r="3.4" fill="#2A1F14" />
      <rect x="30" y="55" width="40" height="24" rx="13" fill="#FCE2BE" />
      <rect x="43" y="59" width="14" height="7" rx="3.5" fill="#2A1F14" />
    </svg>
  );
}
