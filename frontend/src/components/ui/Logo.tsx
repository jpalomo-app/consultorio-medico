export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { box: "w-9 h-9", text: "text-sm", sub: "text-[10px]" },
    md: { box: "w-12 h-12", text: "text-xl", sub: "text-xs" },
    lg: { box: "w-20 h-20", text: "text-4xl", sub: "text-sm" },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      {/* Monograma SM */}
      <div className={`${s.box} bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30 flex-shrink-0`}>
        <span className={`${s.text} font-black text-white tracking-tight`}>SM</span>
      </div>
      <div>
        <p className={`font-black text-gray-900 leading-none ${size === "lg" ? "text-2xl" : size === "md" ? "text-base" : "text-sm"}`}>
          Medicina Laboral
        </p>
        <p className={`${s.sub} text-brand-500 font-semibold tracking-wider uppercase`}>
          Turnos Online
        </p>
      </div>
    </div>
  );
}
