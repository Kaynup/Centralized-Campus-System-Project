export default function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate/10 shadow-sm p-4 sm:p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}