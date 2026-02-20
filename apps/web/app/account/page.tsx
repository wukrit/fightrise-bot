import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@fightrise/database';
import { AccountContent } from './AccountClient';

// Types
interface UserProfile {
  id: string;
  discordUsername: string;
  discordAvatar: string | null;
  startggId: string | null;
  startggGamerTag: string | null;
  startggSlug: string | null;
}

interface TournamentHistory {
  id: string;
  name: string;
  date: string;
  placement: number | null;
  status: string;
}

interface MatchHistory {
  id: string;
  opponent: string;
  result: 'win' | 'loss' | 'pending';
  score: string;
  date: string;
  tournament: string;
}

// Server functions to fetch user data
async function getUserProfile(sessionEmail: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { email: sessionEmail },
  });

  if (!user) return null;

  return {
    id: user.id,
    discordUsername: user.name || 'Unknown',
    discordAvatar: user.image,
    startggId: user.startggId,
    startggGamerTag: user.startggGamerTag,
    startggSlug: user.startggSlug,
  };
}

async function getUserTournaments(userId: string): Promise<TournamentHistory[]> {
  const registrations = await prisma.registration.findMany({
    where: { userId },
    include: {
      tournament: true,
    },
    orderBy: { tournament: { startAt: 'desc' } },
    take: 20,
  });

  return registrations.map((reg) => ({
    id: reg.tournament.id,
    name: reg.tournament.name,
    date: reg.tournament.startAt ? reg.tournament.startAt.toISOString().split('T')[0] : '',
    placement: null, // Would need to query match results
    status: reg.tournament.state.toLowerCase(),
  }));
}

async function getUserMatches(userId: string): Promise<MatchHistory[]> {
  const matches = await prisma.matchPlayer.findMany({
    where: { userId },
    include: {
      match: {
        include: {
          event: {
            include: {
              tournament: true,
            },
          },
        },
      },
    },
    take: 20,
  });

  return matches.map((mp) => ({
    id: mp.match.id,
    opponent: 'Opponent', // Would need to query the other player
    result: mp.isWinner ? 'win' : 'loss',
    score: '-',
    date: mp.match.createdAt?.toISOString().split('T')[0] || '',
    tournament: mp.match.event?.tournament?.name || '',
  }));
}

export default async function AccountPage() {
  // Check authentication - redirect to sign-in if not authenticated
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/api/auth/signin');
  }

  // Fetch user data server-side
  const user = await getUserProfile(session.user.email);
  const tournaments = await getUserTournaments(user?.id || '');
  const matches = await getUserMatches(user?.id || '');

  // If no user found, create a default profile
  const userProfile: UserProfile = user || {
    id: '',
    discordUsername: session.user.name || session.user.email || 'Unknown',
    discordAvatar: session.user.image,
    startggId: null,
    startggGamerTag: null,
    startggSlug: null,
  };

  return (
    <AccountContent
      user={userProfile}
      tournaments={tournaments}
      matches={matches}
    />
  );
}
