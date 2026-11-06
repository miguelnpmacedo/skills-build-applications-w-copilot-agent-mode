import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Workout = {
  _id?: string;
  title: string;
  focus?: string;
  reason?: string;
};

type WorkoutsResponse = { suggestions: Workout[] };

export default function Workouts() {
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<WorkoutsResponse>(`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`)
      .then(({ suggestions }) => {
        if (active) setWorkouts(suggestions);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unknown error');
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {error ? (
          <p role="alert">Unable to load workout suggestions: {error}</p>
        ) : workouts === null ? (
          <p role="status">Loading workout suggestions...</p>
        ) : workouts.length === 0 ? (
          <p>No workout suggestions yet.</p>
        ) : (
          <ul className="list-unstyled mb-0">
            {workouts.map((workout, index) => (
              <li key={workout._id ?? index}>
                {workout.title} · {workout.focus ?? ''} · {workout.reason ?? ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
