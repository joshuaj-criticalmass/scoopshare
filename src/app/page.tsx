export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      {/* Placeholder cone */}
      <svg width="80" height="120" viewBox="0 0 80 120" aria-hidden="true">
        <ellipse cx="40" cy="30" rx="22" ry="20" fill="#F9B4E0" />
        <ellipse cx="40" cy="52" rx="22" ry="20" fill="#A8D8C0" />
        <ellipse cx="40" cy="72" rx="22" ry="20" fill="#F4A6B0" />
        <polygon points="40,118 18,74 62,74" fill="#D4934A" />
        <line x1="40" y1="74" x2="40" y2="118" stroke="#B87333" strokeWidth="1" />
        <line x1="29" y1="74" x2="34" y2="118" stroke="#B87333" strokeWidth="0.8" />
        <line x1="51" y1="74" x2="46" y2="118" stroke="#B87333" strokeWidth="0.8" />
      </svg>

      <h1 className="font-pacifico text-5xl text-amber-600 drop-shadow-sm">
        ScoopShare
      </h1>

      <p className="text-xl text-gray-600 font-semibold max-w-xs">
        The ice cream trading icebreaker game 🍦
      </p>

      <p className="text-sm text-gray-400 mt-4">Coming soon — see you at the townhall!</p>
    </main>
  );
}
