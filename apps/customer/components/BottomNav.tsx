import Link from "next/link";

type Tab = "home" | "explore" | "profile";

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1v-9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  );
}

export default function BottomNav({ active }: { active: Tab }) {
  const activeClass = "text-indigo-600";
  const inactiveClass = "text-stone-300";

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-stone-100 flex items-center justify-around h-16 z-40 safe-area-inset-bottom">
      <Link
        href="/me"
        className={`flex flex-col items-center gap-1 px-6 ${active === "home" ? activeClass : inactiveClass}`}
      >
        <HomeIcon />
        <span className="text-[10px] font-medium">Home</span>
      </Link>

      <button
        disabled
        className="flex flex-col items-center gap-1 px-6 text-stone-200 cursor-not-allowed"
        aria-disabled="true"
      >
        <ExploreIcon />
        <span className="text-[10px] font-medium">Explore</span>
      </button>

      <Link
        href="/profile"
        className={`flex flex-col items-center gap-1 px-6 ${active === "profile" ? activeClass : inactiveClass}`}
      >
        <ProfileIcon />
        <span className="text-[10px] font-medium">Profile</span>
      </Link>
    </nav>
  );
}
