import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

function activityError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw activityError('Activity input must be an object', 400);
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const isObjectId = (value: unknown): value is string =>
    typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

  if (!isObjectId(userId) || !isObjectId(teamId)) {
    throw activityError('Valid userId and teamId are required', 400);
  }
  if (typeof type !== 'string' || !type.trim() || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw activityError('Activity type and positive minutes are required', 400);
  }

  const [user, team] = await Promise.all([
    User.findById(userId).select('_id'),
    Team.findById(teamId).select('_id'),
  ]);
  if (!user || !team) {
    throw activityError('Referenced user or team was not found', 404);
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) {
    throw Object.assign(new Error('Team name is required'), { status: 400 });
  }
  if (typeof mascot !== 'string' || !mascot.trim()) {
    throw Object.assign(new Error('Team mascot is required'), { status: 400 });
  }

  const teamMembers = members === undefined ? [] : members;
  if (!Array.isArray(teamMembers) || teamMembers.some((member) => typeof member !== 'string' || !/^[a-f\d]{24}$/i.test(member))) {
    throw Object.assign(new Error('Team members must be valid user IDs'), { status: 400 });
  }

  return Team.create({ name, mascot, members: teamMembers });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate<{ teamName: string; totalPoints: number }>([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $project: {
        _id: 0,
        teamName: '$name',
        totalPoints: { $sum: '$activities.points' },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivity = await Activity.findOne({ user: user._id })
    .sort({ occurredAt: -1 })
    .lean();
  const activityFocus: Record<string, string> = {
    run: 'endurance',
    cycle: 'endurance',
    cycling: 'endurance',
    strength: 'strength',
    walk: 'mobility',
    yoga: 'mobility',
  };
  const goalFocus = user.fitnessGoal?.trim().toLowerCase();
  const recentFocus = recentActivity && activityFocus[recentActivity.type.trim().toLowerCase()];
  const preferredFocus = [...new Set([goalFocus, recentFocus].filter((focus): focus is string => Boolean(focus)))];

  if (!preferredFocus.length) return [];

  const workouts = await Workout.find({ focus: { $in: preferredFocus } }).lean();
  workouts.sort((left, right) => preferredFocus.indexOf(left.focus) - preferredFocus.indexOf(right.focus));

  return workouts.map((workout) => {
    const matchesGoal = workout.focus.toLowerCase() === goalFocus;
    const reason = matchesGoal
      ? `Matches your ${user.fitnessGoal} fitness goal${recentActivity ? ` and recent ${recentActivity.type} activity` : ''}.`
      : `Recommended based on your recent ${recentActivity?.type} activity.`;
    return { ...workout, reason };
  });
}

export { User };
