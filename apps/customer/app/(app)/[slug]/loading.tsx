export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 pt-12 pb-24">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-10 animate-pulse">

        {/* Merchant logo + name */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-stone-100" />
          <div className="h-8 w-44 bg-stone-100 rounded-xl" />
        </div>

        {/* Progress ring */}
        <div className="w-[200px] h-[200px] rounded-full bg-stone-100" />

        {/* Nudge banner */}
        <div className="w-full h-12 bg-stone-100 rounded-2xl" />

        {/* Check in button */}
        <div className="w-full h-[62px] bg-stone-100 rounded-2xl" />

      </div>
    </div>
  );
}
