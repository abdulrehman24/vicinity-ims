import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { initialInventoryData } from '../data/inventoryData';
import toast from 'react-hot-toast';

const InventoryContext = createContext();

const initialState = {
  equipment: initialInventoryData,
  bookings: [],
  records: [],
  isAdmin: false
};

function inventoryReducer(state, action) {
  switch (action.type) {
    case 'SET_ADMIN':
      return { ...state, isAdmin: action.payload };

    case 'CHECK_OUT_EQUIPMENT': {
      const booking = action.payload;
      const record = {
        id: Date.now() + Math.random(),
        type: 'checkout',
        ...booking,
        timestamp: new Date().toISOString()
      };

      // For single units, update status to checked_out
      // For multi-units, we keep 'available' but track quantities in availability checks
      const updatedEquipment = state.equipment.map(item => {
        if (item.id === booking.equipmentId) {
          const isSingleUnit = item.totalQuantity === 1;
          return {
            ...item,
            status: isSingleUnit ? 'checked_out' : 'available',
            currentBooking: isSingleUnit ? booking : null
          };
        }
        return item;
      });

      return {
        ...state,
        equipment: updatedEquipment,
        bookings: [...state.bookings, { ...booking, id: Date.now() + Math.random() }],
        records: [record, ...state.records]
      };
    }

    case 'BATCH_CHECK_IN': {
      const { items, user, shootName } = action.payload;
      
      // Fix: Process each item individually to avoid condition inheritance bug
      const updatedEquipment = state.equipment.map(eqItem => {
        const returnedItem = items.find(i => i.id === eqItem.id);
        if (returnedItem) {
          return {
            ...eqItem,
            status: returnedItem.reportedProblem ? 'maintenance' : 'available',
            condition: returnedItem.reportedProblem ? 'damaged' : eqItem.condition,
            remarks: returnedItem.reportedProblem ? returnedItem.problemNote : eqItem.remarks,
            currentBooking: null
          };
        }
        return eqItem;
      });

      const returnedIds = items.map(i => i.id);
      const batchRecord = {
        id: Date.now() + Math.random(),
        type: 'checkin',
        equipmentName: `Group Return: ${shootName}`,
        user,
        timestamp: new Date().toISOString(),
        notes: `Batch return of ${items.length} items.`
      };

      return {
        ...state,
        equipment: updatedEquipment,
        bookings: state.bookings.filter(b => !returnedIds.includes(b.equipmentId)),
        records: [batchRecord, ...state.records]
      };
    }

    case 'REPORT_PROBLEM': {
      return {
        ...state,
        equipment: state.equipment.map(item =>
          item.id === action.payload.equipmentId ? { 
            ...item, 
            status: action.payload.severity === 'critical' ? 'maintenance' : item.status,
            remarks: action.payload.description 
          } : item
        ),
        records: [{ ...action.payload, type: 'problem', timestamp: new Date().toISOString() }, ...state.records]
      };
    }

    default:
      return state;
  }
}

export function InventoryProvider({ children }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  const checkOutEquipment = (booking) => dispatch({ type: 'CHECK_OUT_EQUIPMENT', payload: booking });
  const batchCheckIn = (payload) => dispatch({ type: 'BATCH_CHECK_IN', payload });
  const reportProblem = (report) => dispatch({ type: 'REPORT_PROBLEM', payload: report });
  const toggleAdmin = (val) => dispatch({ type: 'SET_ADMIN', payload: val });

  return (
    <InventoryContext.Provider value={{ ...state, checkOutEquipment, batchCheckIn, reportProblem, toggleAdmin }}>
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => useContext(InventoryContext);