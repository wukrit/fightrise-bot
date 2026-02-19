import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@fightrise/database';
import { DashboardContent } from './DashboardClient';

// Types matching the database schema
type TournamentState = 'CREATED' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface Tournament {
  id: string;
  name: string;
  startggSlug: string;
  startAt: string | null;
  endAt: string | null;
  state: TournamentState;
  _count?: {
    registrations: number;
  };
}

// Server component to fetch tournaments
async function getTournaments(): Promise<Tournament[]> {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { startAt: 'desc' },
    include: {
      _count: {
        select: { registrations: true },
      },
    },
  });

  return tournaments as Tournament[];
}

export default async function DashboardPage() {
  // Check authentication - redirect to sign-in if not authenticated
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  // Fetch tournaments server-side
  const tournaments = await getTournaments();

  return (
    <div>
      {/* Add custom font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      <DashboardContent initialTournaments={tournaments} />
    </div>
  );
}
