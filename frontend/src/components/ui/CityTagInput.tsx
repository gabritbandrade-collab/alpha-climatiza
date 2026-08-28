import { useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import type { EmployeeCity } from "../../types";

export interface CityValue {
  city: string;
  state?: string;
}

export function CityTagInput({
  value,
  onChange,
  label = "Região de atendimento",
  hint = "Cidades que este funcionário atende. Serviços dessas cidades poderão ser distribuídos automaticamente para ele.",
}: {
  value: CityValue[];
  onChange: (cities: CityValue[]) => void;
  label?: string;
  hint?: string;
}) {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  function addCity() {
    const trimmed = city.trim();
    if (!trimmed) return;
    if (value.some((c) => c.city.toLowerCase() === trimmed.toLowerCase())) {
      setCity("");
      return;
    }
    onChange([...value, { city: trimmed, state: state.trim().toUpperCase() || undefined }]);
    setCity("");
    setState("");
  }

  function removeCity(cityName: string) {
    onChange(value.filter((c) => c.city !== cityName));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCity();
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">{label}</span>
      <div className="flex gap-2">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nome da cidade"
          className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <input
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="UF"
          maxLength={2}
          className="w-16 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <button
          type="button"
          onClick={addCity}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint}</p>}

      {value.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--text-muted)]">Nenhuma cidade cadastrada ainda.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((c) => (
            <span
              key={c.city}
              className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
            >
              <MapPin className="h-3 w-3" />
              {c.city}
              {c.state ? `/${c.state}` : ""}
              <button
                type="button"
                onClick={() => removeCity(c.city)}
                className="ml-0.5 rounded-full hover:bg-brand-100 dark:hover:bg-brand-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function citiesToValue(cities?: EmployeeCity[]): CityValue[] {
  return (cities || []).map((c) => ({ city: c.city, state: c.state || undefined }));
}
