import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StudioLayoutRecord } from '@/platform/contracts/studioLayouts';

export default function StudioLayoutsPage() {
  const [layouts, setLayouts] = useState<StudioLayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/layouts')
      .then(async (response) => {
        if (!response.ok) throw new Error('Falha ao carregar layouts');
        return response.json() as Promise<StudioLayoutRecord[]>;
      })
      .then(setLayouts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#08111f] p-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Construtor</p>
            <h1 className="text-2xl font-semibold">Layouts</h1>
          </div>
          <Link className="rounded-md border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800" to="/construtor">
            Voltar
          </Link>
        </div>

        {loading ? <p className="text-slate-400">Carregando layouts...</p> : null}
        {!loading && layouts.length === 0 ? <p className="text-slate-400">Nenhum layout disponível.</p> : null}

        <div className="grid gap-3">
          {layouts.map((layout) => (
            <Link
              key={layout.layoutId}
              to={`/construtor/layouts/${encodeURIComponent(layout.layoutId)}`}
              className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-600"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-medium">{layout.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{layout.description || layout.layoutId}</p>
                </div>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-400">
                  {layout.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
