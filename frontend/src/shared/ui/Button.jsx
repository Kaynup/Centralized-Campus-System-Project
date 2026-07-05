const variants = {
  primary: "bg-forest hover:opacity-90 text-white",
  secondary: "bg-slate hover:opacity-90 text-white",
  accent: "bg-gold hover:opacity-90 text-slate",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

export default function Button({ children, onClick, variant = "primary", type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded-md font-medium transition-opacity ${variants[variant]}`}
    >
      {children}
    </button>
  );
}