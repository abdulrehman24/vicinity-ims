import React, { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { eachDayOfInterval, parseISO, format } from 'date-fns';

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

    case 'SET_BOOKINGS':
      return { ...state, bookings: action.payload };
    case 'ADD_BOOKING':
      return { ...state, bookings: [...state.bookings, action.payload] };
    case 'UPDATE_BOOKING_STATUS':
      return {
        ...state,
        bookings: state.bookings.map(b => 
            b.id === action.payload.id ? { ...b, ...action.payload } : b
        )
      };

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
    fetchBookings();
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

  const fetchBookings = async () => {
    try {
      const response = await axios.get('/bookings');
      const bookings = response.data.data.map(b => ({
           ...b,
           id: b.id,
           equipmentId: b.equipment_id,
           shootName: b.project_title,
           quotationNumber: b.quotation_number,
           dates: eachDayOfInterval({ start: parseISO(b.start_date), end: parseISO(b.end_date) }).map(d => format(d, 'yyyy-MM-dd')),
           shift: b.shift,
           quantity: b.quantity
       }));
      dispatch({ type: 'SET_BOOKINGS', payload: bookings });
    } catch (error) {
      console.error("Failed to fetch bookings", error);
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

  const checkOutEquipment = async (bookingData) => {
      try {
          const response = await axios.post('/bookings', bookingData);
          const newBooking = response.data.data;
          const formattedBooking = {
               ...newBooking,
               id: newBooking.id,
               equipmentId: newBooking.equipment_id,
               shootName: newBooking.project_title,
               quotationNumber: newBooking.quotation_number,
               dates: eachDayOfInterval({ start: parseISO(newBooking.start_date), end: parseISO(newBooking.end_date) }).map(d => format(d, 'yyyy-MM-dd')),
               shift: newBooking.shift,
               quantity: newBooking.quantity
           };
          dispatch({ type: 'ADD_BOOKING', payload: formattedBooking });
          toast.success("Booking created successfully");
          fetchEquipment();
      } catch (error) {
          console.error("Checkout failed", error);
          toast.error("Failed to check out equipment");
      }
  };

  const batchCheckIn = async (payload) => {
      try {
          const response = await axios.post('/bookings/return', payload);
          const returnedBookings = response.data.data;
          
          returnedBookings.forEach(b => {
             dispatch({ type: 'UPDATE_BOOKING_STATUS', payload: { id: b.id, status: 'returned' } });
          });
          
          toast.success("Items returned successfully");
          fetchEquipment();
      } catch (error) {
          console.error("Return failed", error);
          toast.error("Failed to return items");
      }
  };
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
