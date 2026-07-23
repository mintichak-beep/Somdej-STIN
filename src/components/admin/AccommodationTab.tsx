import React, { useState, useMemo } from 'react';
import { 
  Student, PracticeSite, Accommodation, Room, StudentAssignment 
} from '../../types';
import { 
  Search, Plus, MapPin, Building, Bed, Users, Calendar, X, Edit, Trash2
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface AccommodationTabProps {
  accommodations: Accommodation[];
  rooms: Room[];
  students: Student[];
  sites: PracticeSite[];
  assignments: StudentAssignment[];
}

export function AccommodationTab({ 
  accommodations, rooms, students, sites, assignments 
}: AccommodationTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const data = useMemo(() => {
    return rooms.map(room => {
        const site = sites.find(s => s.id === room.siteId.id);
        const roomAccommodations = accommodations.filter(a => a.roomId.id === room.id);
        const occupied = roomAccommodations.length;
        return {
            ...room,
            siteName: site?.name || 'Unknown',
            occupied,
            available: room.capacity - occupied,
            assignedStudents: roomAccommodations.map(a => {
                const student = students.find(s => s.id === a.studentId.id);
                return student ? `${student.firstName} ${student.lastName}` : 'Unknown';
            })
        };
    }).filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.siteName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [rooms, accommodations, students, sites, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl w-64">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search room or site..." 
            className="bg-transparent border-none outline-none text-xs w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="px-4 py-2 bg-[#1B365D] text-white text-xs font-bold uppercase rounded-xl flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Accommodation
        </button>
      </div>

      <table className="w-full text-left bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <thead className="bg-[#F4F1EA] text-[10px] uppercase tracking-widest font-bold text-gray-500">
          <tr>
            <th className="p-4">Building/Room</th>
            <th className="p-4">Practice Site</th>
            <th className="p-4">Capacity</th>
            <th className="p-4">Occupied</th>
            <th className="p-4">Status</th>
            <th className="p-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-xs">
          {data.map(r => (
            <tr key={r.id}>
              <td className="p-4 font-bold">{r.name}</td>
              <td className="p-4">{r.siteName}</td>
              <td className="p-4">{r.capacity}</td>
              <td className="p-4">{r.occupied}</td>
              <td className="p-4">
                  <span className={`px-2 py-1 rounded-lg ${r.available > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {r.available > 0 ? 'Available' : 'Full'}
                  </span>
              </td>
              <td className="p-4 flex gap-2">
                <button className="p-2 text-blue-600 rounded-lg"><Edit className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
