import UploadCourse from '@/components/UploadCourse'

export default function AdminDashboard() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <UploadCourse />
        </div>
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <ul className="space-y-3">
            <li className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100">
              <span className="font-medium text-gray-700">Course Generation Queue</span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Active</span>
            </li>
            <li className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100">
              <span className="font-medium text-gray-700">Total Courses</span>
              <span className="text-gray-600 font-mono">0</span>
            </li>
            <li className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100">
              <span className="font-medium text-gray-700">Registered Users</span>
              <span className="text-gray-600 font-mono">0</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
