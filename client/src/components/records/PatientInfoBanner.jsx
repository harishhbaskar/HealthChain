import { User } from 'lucide-react';

function PatientInfoBanner() {
  return (
    <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
      <p className="text-blue-700 text-sm flex items-center">
        <User className="h-4 w-4 mr-2" />
        You are logged in as a <strong>Patient</strong>. You can view your history and verify blockchain integrity, but you cannot add records.
      </p>
    </div>
  );
}

export default PatientInfoBanner;
