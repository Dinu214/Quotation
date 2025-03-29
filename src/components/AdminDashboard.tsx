import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { 
  getPricingConfig, 
  PricingConfig, 
  MeterConfig, 
  ServiceConfig, 
  EdgeDeviceConfig 
} from '../services/pricingService';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(getPricingConfig());
  const [isModified, setIsModified] = useState(false);

  const handleMeterChange = (id: string, field: keyof MeterConfig, value: number) => {
    setPricingConfig(prev => ({
      ...prev,
      meters: prev.meters.map(meter => 
        meter.id === id ? { ...meter, [field]: value } : meter
      )
    }));
    setIsModified(true);
  };

  const handleServiceChange = (id: string, field: keyof ServiceConfig, value: number) => {
    setPricingConfig(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === id ? { ...service, [field]: value } : service
      )
    }));
    setIsModified(true);
  };

  const handleEdgeDeviceChange = (field: keyof EdgeDeviceConfig, value: number) => {
    setPricingConfig(prev => ({
      ...prev,
      edgeDevice: { ...prev.edgeDevice, [field]: value }
    }));
    setIsModified(true);
  };

  const handleSave = () => {
    // Update the lastUpdated timestamp
    const updatedConfig = {
      ...pricingConfig,
      lastUpdated: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem('terraems_pricing_config', JSON.stringify(updatedConfig));
    setIsModified(false);
    alert('Pricing configuration saved successfully!');
  };

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard - Pricing Management</h1>
        <Button variant="secondary" onClick={onLogout}>Logout</Button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Energy Meters Pricing</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meter Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate without AI (₹)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate with AI (₹)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pricingConfig.meters.map(meter => (
                <tr key={meter.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{meter.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      value={meter.rateNoAI}
                      onChange={(e) => handleMeterChange(meter.id, 'rateNoAI', Number(e.target.value))}
                      className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      value={meter.rateWithAI}
                      onChange={(e) => handleMeterChange(meter.id, 'rateWithAI', Number(e.target.value))}
                      className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Services Pricing</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (₹)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minimum (₹)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pricingConfig.services.map(service => (
                <tr key={service.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.name} {service.unit && <span className="text-xs text-gray-500">({service.unit})</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      value={service.rate}
                      onChange={(e) => handleServiceChange(service.id, 'rate', Number(e.target.value))}
                      className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.minimum !== undefined && (
                      <input
                        type="number"
                        min="0"
                        value={service.minimum}
                        onChange={(e) => handleServiceChange(service.id, 'minimum', Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">TerraEdge Device Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rate (₹)</label>
            <input
              type="number"
              min="0"
              value={pricingConfig.edgeDevice.monthlyRate}
              onChange={(e) => handleEdgeDeviceChange('monthlyRate', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">One-Time Rate (₹)</label>
            <input
              type="number"
              min="0"
              value={pricingConfig.edgeDevice.oneTimeRate}
              onChange={(e) => handleEdgeDeviceChange('oneTimeRate', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          variant="primary" 
          onClick={handleSave} 
          disabled={!isModified}
          className={!isModified ? 'opacity-50 cursor-not-allowed' : ''}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default AdminDashboard;
