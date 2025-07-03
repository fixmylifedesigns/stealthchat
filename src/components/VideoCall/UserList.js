import { Users, User } from 'lucide-react'

export default function UserList({ users = [], currentUserId }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users size={20} />
        Users in Room ({users.length})
      </h3>
      
      <div className="space-y-2">
        {users.length === 0 ? (
          <p className="text-gray-500 text-sm">No users in room</p>
        ) : (
          users.map((user) => (
            <div 
              key={user.id} 
              className={`flex items-center gap-3 p-2 rounded ${
                user.id === currentUserId ? 'bg-blue-100' : 'bg-gray-50'
              }`}
            >
              <User size={16} className="text-gray-600" />
              <span className="text-sm">
                {user.name} {user.id === currentUserId && '(You)'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}