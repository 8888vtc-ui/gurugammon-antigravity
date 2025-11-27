import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Users, ArrowLeft } from 'lucide-react';

export const Tournaments: React.FC = () => {
    const [tournaments, setTournaments] = useState<any[]>([]);

    useEffect(() => {
        const fetchTournaments = async () => {
            try {
                const { data } = await api.get('/tournaments');
                setTournaments(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchTournaments();
    }, []);

    return (
        <div className="min-h-screen bg-guru-bg text-white p-6">
            <div className="container mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/lobby" className="p-2 bg-[#1e1e1e] rounded-full hover:bg-[#2d2d2d] transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold text-guru-gold flex items-center gap-3">
                        <Trophy className="w-8 h-8" /> Swiss Tournaments
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournaments.map(tournament => (
                        <div key={tournament.id} className="bg-[#1e1e1e] border border-gray-800 rounded-xl p-6 hover:border-guru-gold/50 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold">{tournament.name}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${tournament.status === 'REGISTRATION' ? 'bg-green-900 text-green-200' :
                                        tournament.status === 'IN_PROGRESS' ? 'bg-blue-900 text-blue-200' :
                                            'bg-gray-800 text-gray-400'
                                    }`}>
                                    {tournament.status}
                                </span>
                            </div>

                            <p className="text-gray-400 text-sm mb-6 line-clamp-2">{tournament.description}</p>

                            <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span>{tournament.participants?.length || 0} / {tournament.maxPlayers || '∞'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>{new Date(tournament.startTime).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <button className="w-full py-3 bg-guru-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors">
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
