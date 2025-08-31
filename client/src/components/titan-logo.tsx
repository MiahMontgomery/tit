export function TitanLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 4-pointed star shape matching the reference */}
      <path
        d="M12 0L16 8L24 12L16 16L12 24L8 16L0 12L8 8L12 0Z"
        fill="#40e0d0"
        className="drop-shadow-sm"
      />
    </svg>
  );
}
