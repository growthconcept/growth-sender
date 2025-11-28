export default function Logo({ className = "h-8 w-8", color = "#22c55e" }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Balão de fala circular com cauda */}
      <circle cx="32" cy="28" r="20" fill={color} />
      {/* Cauda do balão apontando para baixo-esquerda */}
      <path
        d="M16 44 L8 56 L20 52 Z"
        fill={color}
      />
      {/* Letra G estilizada - design moderno com curvas suaves */}
      <path
        d="M28 20 L38 20 Q42 20 42 24 L42 28 Q42 32 38 32 L34 32 L34 30 L38 30 Q40 30 40 28 L40 24 Q40 22 38 22 L28 22 L28 36 Q28 38 30 38 L36 38 Q38 38 38 36 L36 36 Q34 36 34 34 L30 34 Q28 34 28 36 L28 20 Z"
        fill="white"
      />
      {/* Barra horizontal interna do G */}
      <path
        d="M30 28 L34 28 L34 30 L30 30 Z"
        fill={color}
      />
    </svg>
  );
}

