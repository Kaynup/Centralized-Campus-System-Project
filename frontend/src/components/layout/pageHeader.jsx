import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function PageHeader({ title, subtitle, icon: Icon, backTo, actions }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3 min-w-0">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-slate/5 text-slate shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {Icon && (
          <span className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-forest/10 text-forest shrink-0">
            <Icon className="w-5 h-5" />
          </span>
        )}

        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold text-slate truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate/60 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}