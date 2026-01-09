import React, { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

const InventoryContext = createContext();

const initialState = {
  equipment: [],
  bookings: [],
  records: [],
  isAdmin: localStorage.getItem('isAdmin') === 'true'
};

function inventoryReducer(state, action) {
  switch (action.type) {
    case 'SET_EQUIPMENT':
      return { ...state, equipment: action.payload };
    case 'ADD_EQUIPMENT':
      return { ...state, equipment: [...state.equipment, action.payload] };
    case 'UPDATE_EQUIPMENT':
      return {
        ...state,
        equipment: state.equipment.map(item => 
          item.id === action.payload.id ? action.payload : item
        )
      };
    case 'DELETE_EQUIPMENT':
      return {
        ...state,
        equipment: state.equipment.filter(item => item.id !== action.payload)
      };
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

      // Update local state for immediate feedback
      // Ideally this should also sync with backend status
      const updatedEquipment = state.equipment.map(item => {
        if (item.id === booking.equipmentId) {
          return {
            ...item,
            status: 'checked_out',
            currentBooking: booking
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

export function InventoryProvider({ children, user }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    localStorage.setItem('isAdmin', state.isAdmin);
  }, [state.isAdmin]);

  const fetchEquipment = async () => {
    try {
      const response = await axios.get('/equipment');
      dispatch({ type: 'SET_EQUIPMENT', payload: response.data.data });
    } catch (error) {
      console.error("Failed to fetch equipment", error);
      toast.error("Failed to load inventory");
    }
  };

  const addEquipment = async (newItem) => {
    try {
      const response = await axios.post('/equipment', newItem);
      dispatch({ type: 'ADD_EQUIPMENT', payload: response.data.data });
      toast.success("Equipment added successfully");
    } catch (error) {
      console.error("Failed to add equipment", error);
      toast.error("Failed to add equipment");
    }
  };

  const updateEquipment = async (updatedItem) => {
    try {
      const response = await axios.put(`/equipment/${updatedItem.id}`, updatedItem);
      dispatch({ type: 'UPDATE_EQUIPMENT', payload: response.data.data });
      toast.success("Equipment updated successfully");
    } catch (error) {
      console.error("Failed to update equipment", error);
      toast.error("Failed to update equipment");
    }
  };

  const deleteEquipment = async (id) => {
      try {
          await axios.delete(`/equipment/${id}`);
          dispatch({ type: 'DELETE_EQUIPMENT', payload: id });
          toast.success("Equipment deleted successfully");
      } catch (error) {
          console.error("Failed to delete equipment", error);
          toast.error("Failed to delete equipment");
      }
  };

  const checkOutEquipment = (booking) => dispatch({ type: 'CHECK_OUT_EQUIPMENT', payload: booking });
  const batchCheckIn = (payload) => dispatch({ type: 'BATCH_CHECK_IN', payload });
  const reportProblem = (report) => dispatch({ type: 'REPORT_PROBLEM', payload: report });
  const toggleAdmin = (val) => dispatch({ type: 'SET_ADMIN', payload: val });

  return (
    <InventoryContext.Provider value={{ 
        ...state, 
        addEquipment, 
        updateEquipment, 
        deleteEquipment,
        checkOutEquipment, 
        batchCheckIn, 
        reportProblem, 
        toggleAdmin 
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => useContext(InventoryContext);
