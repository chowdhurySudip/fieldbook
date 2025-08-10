// Sample data for development and testing

import { Employee, Site } from '../types';
import { generateId } from '../utils/calculations';

export const sampleEmployees: Employee[] = [
  {
    id: generateId(),
    name: 'Ravi Kumar',
    baseWageRate: 800,
    contactInfo: '+91 98765 43210',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: generateId(),
    name: 'Sita Verma',
    baseWageRate: 900,
    contactInfo: '+91 99887 66554',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: generateId(),
    name: 'Ajay Sharma',
    baseWageRate: 750,
    contactInfo: '+91 91234 56789',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: generateId(),
    name: 'Meena Iyer',
    baseWageRate: 700,
    contactInfo: '+91 90909 80808',
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const sampleSites: Site[] = [
  {
    id: generateId(),
    name: 'DLF IT Park – Phase 2',
    startDate: new Date('2025-01-15'),
    isActive: true,
    totalWithdrawn: 125000,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: generateId(),
    name: 'Prestige Green Meadows',
    startDate: new Date('2025-02-01'),
    isActive: true,
    totalWithdrawn: 98000,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: generateId(),
    name: 'Metro Line-3 Substation',
    startDate: new Date('2024-12-10'),
    isActive: false,
    totalWithdrawn: 210000,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const initializeSampleData = async (actions: any) => {
  try {
    // Add sample employees
    for (const employee of sampleEmployees) {
      await actions.addEmployee({
        name: employee.name,
        baseWageRate: employee.baseWageRate,
        contactInfo: employee.contactInfo,
        isActive: employee.isActive
      });
    }

    // Add sample sites
    for (const site of sampleSites) {
      await actions.addSite({
        name: site.name,
        startDate: site.startDate,
        isActive: site.isActive,
        totalWithdrawn: site.totalWithdrawn
      });
    }

    console.log('Sample data initialized successfully');
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
};
