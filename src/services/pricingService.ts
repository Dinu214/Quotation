// Types for pricing data
export interface MeterConfig {
  id: string;
  name: string;
  rateNoAI: number;
  rateWithAI: number;
}

export interface ServiceConfig {
  id: string;
  name: string;
  rate: number;
  unit?: string;
  minimum?: number;
}

export interface EdgeDeviceConfig {
  monthlyRate: number;
  oneTimeRate: number;
}

export interface PricingConfig {
  meters: MeterConfig[];
  services: ServiceConfig[];
  edgeDevice: EdgeDeviceConfig;
  lastUpdated: string;
}

// Default pricing configuration
const defaultPricing: PricingConfig = {
  meters: [
    { id: 'm1', name: 'Single phase energy meter KWH only', rateNoAI: 10, rateWithAI: 20 },
    { id: 'm2', name: 'Single phase energy meter kwh, KW, V, I, pf', rateNoAI: 20, rateWithAI: 40 },
    { id: 'm3', name: '3 phase energy meter KWH, KW, V, I, Ph', rateNoAI: 30, rateWithAI: 60 },
    { id: 'm4', name: '3 phase energy meter KWH, KW, V, I, KVAr, harmonics', rateNoAI: 60, rateWithAI: 120 },
  ],
  services: [
    { id: 's1', name: 'Mimics pages - SLD, electrical component, energy flows etc', rate: 2000, unit: 'per page' },
    { id: 's2', name: 'AI Philosophy for TerraAI', rate: 2000, unit: 'per component', minimum: 150000 },
    { id: 's3', name: 'Initialization, Dashboards, Installation, alarms & commissioning', rate: 1000, unit: 'per component', minimum: 100000 },
  ],
  edgeDevice: {
    monthlyRate: 100,
    oneTimeRate: 3000
  },
  lastUpdated: new Date().toISOString()
};

// Storage key
const PRICING_STORAGE_KEY = 'terraems_pricing_config';

// Get pricing data from localStorage or use default
export const getPricingConfig = (): PricingConfig => {
  try {
    const storedData = localStorage.getItem(PRICING_STORAGE_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
    return defaultPricing;
  } catch (error) {
    console.error('Error loading pricing data:', error);
    return defaultPricing;
  }
};

// Save pricing data to localStorage
export const savePricingConfig = (config: PricingConfig): boolean => {
  try {
    localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Error saving pricing data:', error);
    return false;
  }
};
