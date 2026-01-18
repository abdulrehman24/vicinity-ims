import React from 'react';

function AdminSettings() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#4a5a67] tracking-tight">Settings</h1>
          <div className="w-10 h-1 bg-[#ebc1b6] rounded-full mt-2" />
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Global IMS settings for super administrators will be configured here.
      </p>
    </div>
  );
}

export default AdminSettings;

