import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';

type Props = {
  title: string;
  description: string;
  endpoint: string;
  responseKey: string;
  emptyMessage: string;
  renderItem: (item: Record<string, unknown>) => ReactNode;
};

export function CapabilityCard({ title, description, endpoint, responseKey, emptyMessage, renderItem }: Props) {
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<unknown>(endpoint)
      .then((data) => {
        const records = data && typeof data === 'object'
          ? (data as Record<string, unknown>)[responseKey]
          : undefined;
        if (!Array.isArray(records)) throw new Error('Unexpected response format');
        if (active) setItems(records as Record<string, unknown>[]);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unknown error');
      });
    return () => { active = false; };
  }, [endpoint, responseKey]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {error ? (
          <p role="alert">Unable to load {title.toLowerCase()}: {error}</p>
        ) : items === null ? (
          <p role="status">Loading {title.toLowerCase()}...</p>
        ) : items.length === 0 ? (
          <p>{emptyMessage}</p>
        ) : (
          <ul className="list-unstyled mb-0">
            {items.map((item, index) => <li key={String(item._id ?? index)}>{renderItem(item)}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
