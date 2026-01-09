export const initialInventoryData = [
  {
    id: 1,
    name: 'CANON EOS C70',
    category: 'Camera Body',
    equipmentType: 'Camera',
    serialNumber: 'C70001',
    status: 'available',
    totalQuantity: 1,
    purchaseDate: '2023-01-15',
    businessUnit: 'Studio',
    condition: 'excellent',
    location: 'Studio A',
    image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=300&fit=crop'
  },
  {
    id: 2,
    name: 'SONY FX6',
    category: 'Camera Body',
    equipmentType: 'Camera',
    serialNumber: 'FX6001',
    status: 'available',
    totalQuantity: 1,
    purchaseDate: '2023-02-20',
    businessUnit: 'Events',
    condition: 'excellent',
    location: 'Studio A',
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop'
  },
  {
    id: 11,
    name: 'V-MOUNT BATTERY (98WH)',
    category: 'Battery',
    equipmentType: 'Accessories',
    serialNumber: 'BATT-VM-98',
    status: 'available',
    totalQuantity: 12, // Multi-unit item
    purchaseDate: '2023-03-10',
    businessUnit: 'Studio',
    condition: 'excellent',
    location: 'Charging Station',
    image: 'https://images.unsplash.com/photo-1619133360341-7e3e53669145?w=400&h=300&fit=crop'
  },
  {
    id: 13,
    name: 'C-STAND (40")',
    category: 'Tripod', // Mapped to Tripod/Grip for categorization
    equipmentType: 'Grip',
    serialNumber: 'GRIP-CS-40',
    status: 'available',
    totalQuantity: 8, // Multi-unit item
    purchaseDate: '2023-05-12',
    businessUnit: 'Studio',
    condition: 'excellent',
    location: 'Grip Room',
    image: 'https://images.unsplash.com/photo-1581591524425-c7e0978865fc?w=400&h=300&fit=crop'
  },
  {
    id: 12,
    name: 'RODE NTG4+',
    category: 'Audio Equipment',
    equipmentType: 'Sound',
    serialNumber: 'NTG4-992',
    status: 'available',
    totalQuantity: 2,
    purchaseDate: '2024-01-12',
    businessUnit: 'Studio',
    condition: 'excellent',
    location: 'Audio Locker',
    image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=300&fit=crop'
  }
];

export const categories = [
  'Camera Body', 
  'Lens', 
  'Tripod', 
  'Lighting', 
  'Audio Equipment', 
  'Monitor', 
  'Grip', 
  'Battery', 
  'Storage', 
  'Cable', 
  'Accessories'
];

export const equipmentTypes = [
  'Camera', 
  'Lighting', 
  'Grip', 
  'Sound', 
  'DIT', 
  'Production', 
  'Post-Production',
  'Accessories'
];

export const businessUnits = [
  'Studio', 
  'Events', 
  'Rental', 
  'Post-House'
];

export const conditions = [
  'excellent', 
  'good', 
  'fair', 
  'poor', 
  'damaged'
];

export const statuses = [
  'available', 
  'checked_out', 
  'maintenance', 
  'decommissioned', 
  'reserved'
];

export const shifts = [
  'Full Day', 
  'AM', 
  'PM'
];