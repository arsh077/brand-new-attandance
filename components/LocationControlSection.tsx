// Location Control Section - Admin Panel Component
// Allows admin to control office location and employee remote login permissions

import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { geoLocationService } from '../services/geoLocationService';
import { firebaseLocationPermissionService, EmployeeLocationPermission } from '../services/firebaseLocationPermissionService';
import { OfficeLocation } from '../services/firebaseSettingsService';

interface LocationControlSectionProps {
  employees: Employee[];
  systemSettings: any;
  onUpdateSettings: (settings: any) => void;
}

const LocationControlSection: React.FC<LocationControlSectionProps> = ({
  employees,
  systemSettings,
  onUpdateSettings
}) => {
  const [geoEnabled, setGeoEnabled] = useState(systemSettings.geoLocationEnabled || false);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation>(
    systemSettings.officeLocation || {
      name: 'Legal Success India - Main Office',
      address: '2 Number, Sah Aman Lane, Kolkata 700023',
      latitude: 22.5726,
      longitude: 88.3639,
      radiusMeters: 1
    }
  );

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState('');
  const [testingLocation, setTestingLocation] = useState(false);
  const [testResult, setTestResult] = useState('');

  // Employee permissions
  const [permissions, setPermissions] = useState<Record<string, EmployeeLocationPermission>>({});
  const [savingPermissions, setSavingPermissions] = useState<Record<string, boolean>>({});

  // Load permissions on mount
  useEffect(() => {
    loadPermissions();
  }, [employees]);

  const loadPermissions = async () => {
    const permMap: Record<string, EmployeeLocationPermission> = {};
    for (const emp of employees) {
      const perm = await firebaseLocationPermissionService.getPermission(emp.id);
      if (perm) {
        permMap[emp.id] = perm;
      } else {
        permMap[emp.id] = {
          employeeId: emp.id,
          employeeName: emp.name,
          allowRemoteLogin: false,
          lastUpdatedBy: 'System',
          lastUpdatedAt: new Date().toISOString()
        };
      }
    }
    setPermissions(permMap);
  };

  const handleGeoToggle = async () => {
    const newEnabled = !geoEnabled;
    setGeoEnabled(newEnabled);
    
    await onUpdateSettings({
      ...systemSettings,
      geoLocationEnabled: newEnabled
    });
    
    alert(newEnabled ? '✅ Geo-Location verification enabled!' : '⚠️ Geo-Location verification disabled!');
  };

  const handleGeocodeAddress = async () => {
    if (!officeLocation.address.trim()) {
      alert('Please enter an address first');
      return;
    }

    setGeocoding(true);
    setGeocodeResult('🔍 Searching...');

    try {
      const coords = await geoLocationService.geocodeAddress(officeLocation.address);
      
      if (coords) {
        setOfficeLocation({
          ...officeLocation,
          latitude: coords.latitude,
          longitude: coords.longitude
        });
        setGeocodeResult(`✅ Found: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
        
        // Auto-save after geocoding
        setTimeout(() => handleSaveLocation(), 1000);
      } else {
        setGeocodeResult('❌ Address not found. Please check and try again.');
      }
    } catch (error) {
      setGeocodeResult('❌ Error geocoding address');
    } finally {
      setGeocoding(false);
    }
  };

  const handleTestLocation = async () => {
    setTestingLocation(true);
    setTestResult('📍 Getting your current location...');

    try {
      const result = await geoLocationService.verifyOfficeLocation(officeLocation);
      
      if (result.allowed) {
        setTestResult(`✅ ${result.reason}`);
      } else {
        setTestResult(`❌ ${result.reason}`);
      }
    } catch (error: any) {
      setTestResult(`❌ ${error.message}`);
    } finally {
      setTestingLocation(false);
    }
  };

  const handleSaveLocation = async () => {
    await onUpdateSettings({
      ...systemSettings,
      officeLocation,
      geoLocationEnabled: geoEnabled
    });
    
    alert('✅ Office location saved successfully!');
  };

  const handleTogglePermission = async (employeeId: string) => {
    const current = permissions[employeeId];
    const newPerm: EmployeeLocationPermission = {
      ...current,
      allowRemoteLogin: !current.allowRemoteLogin,
      lastUpdatedBy: 'Admin',
      lastUpdatedAt: new Date().toISOString()
    };

    setSavingPermissions(prev => ({ ...prev, [employeeId]: true }));

    try {
      await firebaseLocationPermissionService.updatePermission(newPerm);
      setPermissions(prev => ({ ...prev, [employeeId]: newPerm }));
    } catch (error) {
      alert('❌ Error updating permission');
    } finally {
      setSavingPermissions(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border-2 border-indigo-200 shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black text-indigo-900 mb-2">📍 Geo-Location Verification</h3>
            <p className="text-indigo-600 font-bold">Control office location-based login restrictions</p>
          </div>
          <button
            onClick={handleGeoToggle}
            className={`relative w-20 h-10 rounded-full transition-all ${
              geoEnabled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute w-8 h-8 bg-white rounded-full shadow-md top-1 transition-all ${
                geoEnabled ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        {geoEnabled ? (
          <div className="bg-green-100 border border-green-300 rounded-2xl p-4">
            <p className="text-green-800 font-black text-sm">✅ Geo-Location Verification: ACTIVE</p>
            <p className="text-green-700 text-xs mt-1">Employees must be within office radius to login (unless admin grants remote access)</p>
          </div>
        ) : (
          <div className="bg-amber-100 border border-amber-300 rounded-2xl p-4">
            <p className="text-amber-800 font-black text-sm">⚠️ Geo-Location Verification: DISABLED</p>
            <p className="text-amber-700 text-xs mt-1">All employees can login from anywhere</p>
          </div>
        )}
      </div>

      {/* Office Location Settings */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
        <h3 className="text-xl font-black text-gray-900 mb-6">🏢 Office Location Configuration</h3>

        <div className="space-y-5">
          {/* Office Name */}
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Office Name</label>
            <input
              type="text"
              value={officeLocation.name}
              onChange={(e) => setOfficeLocation({ ...officeLocation, name: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              placeholder="Legal Success India - Main Office"
            />
          </div>

          {/* Office Address with Geocode */}
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Office Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={officeLocation.address}
                onChange={(e) => setOfficeLocation({ ...officeLocation, address: e.target.value })}
                className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                placeholder="2 Number, Sah Aman Lane, Kolkata 700023"
              />
              <button
                onClick={handleGeocodeAddress}
                disabled={geocoding}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black transition-all disabled:opacity-50"
              >
                {geocoding ? '🔍 ...' : '🗺️ Find GPS'}
              </button>
            </div>
            {geocodeResult && (
              <p className={`text-sm font-bold mt-2 ${geocodeResult.includes('✅') ? 'text-green-600' : 'text-gray-600'}`}>
                {geocodeResult}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">Uses free OpenStreetMap API to find coordinates</p>
          </div>

          {/* GPS Coordinates (Manual Override) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={officeLocation.latitude}
                onChange={(e) => setOfficeLocation({ ...officeLocation, latitude: parseFloat(e.target.value) })}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={officeLocation.longitude}
                onChange={(e) => setOfficeLocation({ ...officeLocation, longitude: parseFloat(e.target.value) })}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Radius Control */}
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">
              Allowed Radius: {officeLocation.radiusMeters} meter{officeLocation.radiusMeters !== 1 ? 's' : ''}
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={officeLocation.radiusMeters}
              onChange={(e) => setOfficeLocation({ ...officeLocation, radiusMeters: parseInt(e.target.value) })}
              className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1m (Strictest)</span>
              <span>50m (Moderate)</span>
              <span>100m (Flexible)</span>
            </div>
            <p className="text-xs text-indigo-600 font-bold mt-2">
              ⚠️ Current setting: Login allowed within {officeLocation.radiusMeters}m of office center
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSaveLocation}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black transition-all shadow-lg"
            >
              💾 Save Office Location
            </button>
            <button
              onClick={handleTestLocation}
              disabled={testingLocation}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black transition-all shadow-lg disabled:opacity-50"
            >
              {testingLocation ? '📍 Testing...' : '🧪 Test My Location'}
            </button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-2xl border-2 ${testResult.includes('✅') ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <p className={`font-bold text-sm ${testResult.includes('✅') ? 'text-green-800' : 'text-red-800'}`}>
                {testResult}
              </p>
            </div>
          )}

          {/* Map Preview Link */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-blue-800 font-bold text-sm mb-2">🗺️ View on Map:</p>
            <a
              href={`https://www.openstreetmap.org/?mlat=${officeLocation.latitude}&mlon=${officeLocation.longitude}#map=19/${officeLocation.latitude}/${officeLocation.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-bold text-sm underline"
            >
              Open in OpenStreetMap →
            </a>
          </div>
        </div>
      </div>

      {/* Employee Remote Login Permissions */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <h3 className="text-xl font-black text-gray-900 mb-1">🔓 Remote Login Permissions</h3>
          <p className="text-gray-600 font-bold text-sm">Grant specific employees permission to login from home/anywhere</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left font-black text-gray-500 uppercase text-xs">Employee</th>
                <th className="px-6 py-4 text-center font-black text-gray-500 uppercase text-xs">Remote Login</th>
                <th className="px-6 py-4 text-left font-black text-gray-500 uppercase text-xs">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.filter(e => e.status === 'ACTIVE' || !(e as any).status).map((emp) => {
                const perm = permissions[emp.id];
                if (!perm) return null;

                return (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900">{emp.name}</p>
                        <p className="text-sm text-gray-500">{emp.designation}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleTogglePermission(emp.id)}
                        disabled={savingPermissions[emp.id]}
                        className={`relative w-16 h-8 rounded-full transition-all ${
                          perm.allowRemoteLogin ? 'bg-green-500' : 'bg-gray-300'
                        } ${savingPermissions[emp.id] ? 'opacity-50' : ''}`}
                      >
                        <div
                          className={`absolute w-6 h-6 bg-white rounded-full shadow-md top-1 transition-all ${
                            perm.allowRemoteLogin ? 'right-1' : 'left-1'
                          }`}
                        />
                      </button>
                      <p className={`text-xs font-bold mt-1 ${perm.allowRemoteLogin ? 'text-green-600' : 'text-gray-400'}`}>
                        {perm.allowRemoteLogin ? 'ALLOWED' : 'BLOCKED'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-500">
                        {new Date(perm.lastUpdatedAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-gray-400">by {perm.lastUpdatedBy}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-amber-50 border-t border-amber-100">
          <p className="text-amber-800 font-bold text-xs">
            💡 TIP: Enable remote login for employees working from home, traveling, or in special circumstances.
            They will bypass office location verification.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationControlSection;
