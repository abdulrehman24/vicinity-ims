import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { eachDayOfInterval, parseISO, format } from 'date-fns';

const InventoryContext = createContext();

const initialState = {
  equipment: [],
  categories: [],
  bundles: [],
  personalBundles: [],
  drafts: [],
  bookings: [],
  records: [],
  stockTakes: [],
  isAdmin: localStorage.getItem('isAdmin') === 'true'
};

function inventoryReducer(state, action) {
  switch (action.type) {
    case 'SET_EQUIPMENT':
      return { ...state, equipment: action.payload };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
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
      return { ...state, equipment: state.equipment.filter(item => item.id !== action.payload) };
    case 'SET_ADMIN':
      return { ...state, isAdmin: action.payload };
    case 'ADD_STOCK_TAKE':
      return { ...state, stockTakes: [action.payload, ...state.stockTakes] };

    case 'SET_BOOKINGS':
      return { ...state, bookings: action.payload };
    case 'SET_BUNDLES':
      return { ...state, bundles: action.payload };
    case 'SET_PERSONAL_BUNDLES':
      return { ...state, personalBundles: action.payload };
    case 'SET_DRAFTS':
      return { ...state, drafts: action.payload };
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

  const fetchEquipment = useCallback(async () => {
    try {
      const response = await axios.get('/equipment', {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        params: { _t: new Date().getTime() }
      });
      dispatch({ type: 'SET_EQUIPMENT', payload: response.data.data });
    } catch (error) {
      console.error("Failed to fetch equipment", error);
      toast.error("Failed to load inventory");
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('/api/admin/categories', { params: { length: 1000 } });
      const list = (response.data.data || []).filter(c => c.is_active).map(c => c.name);
      dispatch({ type: 'SET_CATEGORIES', payload: list });
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get('/bookings', {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        params: { _t: new Date().getTime() }
      });
      const flatBookings = [];

      response.data.data.forEach(b => {
        let datesArray = [];
        if (b.dates && Array.isArray(b.dates) && b.dates.length > 0) {
            datesArray = b.dates.map(d => format(parseISO(d.date), 'yyyy-MM-dd'));
        } else if (b.start_date && b.end_date) {
            datesArray = eachDayOfInterval({ start: parseISO(b.start_date), end: parseISO(b.end_date) }).map(d => format(d, 'yyyy-MM-dd'));
        }

        const common = {
          id: b.id,
          shootName: b.project_title,
          quotationNumber: b.quotation_number,
          remarks: b.remarks || '',
          collaborators: b.collaborators || [],
          status: b.status,
          startDate: b.start_date,
          endDate: b.end_date,
          dates: datesArray,
          shift: b.shift,
          user: b.user || null,
          returnedAt: b.returned_at || null,
          createdAt: b.created_at,
        };

        if (Array.isArray(b.equipments) && b.equipments.length > 0) {
          b.equipments.forEach(eq => {
            flatBookings.push({
              ...common,
              equipmentId: eq.id,
              quantity: eq.pivot?.quantity ?? 1,
              bookingEquipmentId: eq.pivot?.id,
              equipmentName: eq.name,
            });
          });
        }
      });

      dispatch({ type: 'SET_BOOKINGS', payload: flatBookings });
    } catch (error) {
      console.error("Failed to fetch bookings", error);
    }
  }, []);

  const fetchBundles = useCallback(async () => {
    try {
      const response = await axios.get('/api/bundles');
      dispatch({ type: 'SET_BUNDLES', payload: response.data });
    } catch (error) {
      console.error("Failed to fetch bundles", error);
    }
  }, []);

  const fetchPersonalBundles = useCallback(async () => {
    try {
      const response = await axios.get('/api/personal-bundles');
      dispatch({ type: 'SET_PERSONAL_BUNDLES', payload: response.data });
    } catch (error) {
      console.error("Failed to fetch personal bundles", error);
    }
  }, []);

  const fetchDrafts = useCallback(async () => {
    try {
      const response = await axios.get('/api/drafts');
      dispatch({ type: 'SET_DRAFTS', payload: response.data });
    } catch (error) {
      console.error("Failed to fetch drafts", error);
    }
  }, []);

  const savePersonalBundle = useCallback(async (bundleData) => {
    try {
      await axios.post('/api/personal-bundles', bundleData);
      toast.success("Personal bundle saved successfully");
      fetchPersonalBundles();
      return true;
    } catch (error) {
      console.error("Failed to save personal bundle", error);
      toast.error("Failed to save personal bundle");
      return false;
    }
  }, [fetchPersonalBundles]);

  const saveDraft = useCallback(async (draftData) => {
    try {
      if (draftData.id) {
        await axios.put(`/api/drafts/${draftData.id}`, draftData);
      } else {
        await axios.post('/api/drafts', draftData);
      }
      toast.success("Draft saved successfully");
      fetchDrafts();
      return true;
    } catch (error) {
      console.error("Failed to save draft", error);
      toast.error("Failed to save draft");
      return false;
    }
  }, [fetchDrafts]);

  const deleteDraft = useCallback(async (id) => {
    try {
      await axios.delete(`/api/drafts/${id}`);
      toast.success("Draft deleted");
      fetchDrafts();
      return true;
    } catch (error) {
      console.error("Failed to delete draft", error);
      toast.error("Failed to delete draft");
      return false;
    }
  }, [fetchDrafts]);

  const addEquipment = useCallback(async (newItem) => {
    try {
      let response;
      if (newItem.imageFile) {
        const formData = new FormData();
        Object.keys(newItem).forEach(key => {
          if (key === 'imageFile') {
            formData.append('image', newItem.imageFile);
          } else if (key !== 'image') {
            formData.append(key, newItem[key]);
          }
        });
        response = await axios.post('/equipment', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        const { image, imageFile, ...rest } = newItem;
        response = await axios.post('/equipment', rest);
      }

      dispatch({ type: 'ADD_EQUIPMENT', payload: response.data.data });
      toast.success("Equipment added successfully");
      return true;
    } catch (error) {
      console.error("Failed to add equipment", error);
      toast.error(error.response?.data?.message || "Failed to add equipment");
      return false;
    }
  }, []);

  const updateEquipment = useCallback(async (updatedItem) => {
    try {
      let response;
      if (updatedItem.imageFile) {
        const formData = new FormData();
        formData.append('_method', 'PUT');
        Object.keys(updatedItem).forEach(key => {
          if (key === 'imageFile') {
            formData.append('image', updatedItem.imageFile);
          } else if (key !== 'image') {
            formData.append(key, updatedItem[key]);
          }
        });
        response = await axios.post(`/equipment/${updatedItem.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        const { image, imageFile, ...rest } = updatedItem;
        response = await axios.put(`/equipment/${updatedItem.id}`, rest);
      }

      dispatch({ type: 'UPDATE_EQUIPMENT', payload: response.data.data });
      toast.success("Equipment updated successfully");
      return true;
    } catch (error) {
      console.error("Failed to update equipment", error);
      toast.error(error.response?.data?.message || "Failed to update equipment");
      return false;
    }
  }, []);

  const updateLocalEquipment = useCallback((updatedItem) => {
    dispatch({ type: 'UPDATE_EQUIPMENT', payload: updatedItem });
  }, []);

  const deleteEquipment = useCallback(async (id) => {
      try {
          await axios.delete(`/equipment/${id}`);
          dispatch({ type: 'DELETE_EQUIPMENT', payload: id });
          toast.success("Equipment deleted successfully");
      } catch (error) {
          console.error("Failed to delete equipment", error);
          toast.error("Failed to delete equipment");
      }
  }, []);

  const checkOutEquipment = useCallback(async (bookingData, options = {}) => {
      const { showToast = true } = options;
      try {
          const response = await axios.post('/bookings', bookingData);
          if (showToast) {
              toast.success("Booking created successfully");
          }
          fetchEquipment();
          fetchBookings();
      } catch (error) {
          console.error("Checkout failed", error);
          toast.error("Failed to check out equipment");
      }
  }, [fetchEquipment, fetchBookings]);

  const batchCheckIn = useCallback(async (payload) => {
      try {
          await axios.post('/bookings/return', payload);
          toast.success("Items returned successfully");
          fetchEquipment();
          fetchBookings();
      } catch (error) {
          console.error("Return failed", error);
          toast.error("Failed to return items");
      }
  }, [fetchEquipment, fetchBookings]);

  const cancelBooking = useCallback(async (id) => {
      try {
          await axios.post(`/bookings/${id}/cancel`);
          toast.success("Booking cancelled");
          fetchBookings();
          fetchEquipment();
      } catch (error) {
          console.error("Cancel failed", error);
          toast.error(error.response?.data?.message || "Failed to cancel booking");
      }
  }, [fetchBookings, fetchEquipment]);

  const batchCancel = useCallback(async (ids) => {
    try {
        await Promise.all(ids.map(id => axios.post(`/bookings/${id}/cancel`)));
        toast.success("Bookings cancelled successfully");
        fetchBookings();
        fetchEquipment();
    } catch (error) {
        console.error("Batch cancel failed", error);
        toast.error("Failed to cancel some bookings");
        fetchBookings();
    }
  }, [fetchBookings, fetchEquipment]);

  const updateBooking = useCallback(async (id, data) => {
      try {
          await axios.put(`/bookings/${id}`, data);
          toast.success("Booking updated");
          fetchBookings();
      } catch (error) {
          console.error("Update failed", error);
          toast.error(error.response?.data?.message || "Failed to update booking");
      }
  }, [fetchBookings]);

  const replaceBooking = useCallback(async (ids, payload, options = {}) => {
    const { showToast = true } = options;
    try {
        await axios.post('/bookings/replace', { ids, ...payload });
        if (showToast) {
            toast.success("Booking updated successfully");
        }
        fetchBookings();
    } catch (error) {
        console.error("Replace failed", error);
        toast.error(error.response?.data?.message || "Failed to update booking");
    }
  }, [fetchBookings]);

  const reportProblem = useCallback(async (report) => {
    try {
      const response = await axios.post('/support-tickets', report);
      const ticket = response.data?.data;
      dispatch({ type: 'REPORT_PROBLEM', payload: { ...report, ticketCode: ticket?.ticket_code } });
      if (ticket?.ticket_code) {
        toast.success(`Support ticket ${ticket.ticket_code} created`);
      } else {
        toast.success('Support ticket created');
      }
    } catch (error) {
      console.error("Support ticket failed", error);
      toast.error("Failed to create support ticket");
    }
  }, []);

  const toggleAdmin = useCallback((val) => dispatch({ type: 'SET_ADMIN', payload: val }), []);

  const addStockTake = useCallback((record) => {
    dispatch({ type: 'ADD_STOCK_TAKE', payload: record });
    toast.success("Stock take saved");
  }, []);

  const fetchEquipmentLogs = useCallback(async (equipmentId) => {
    try {
        const response = await axios.get(`/equipment/${equipmentId}/logs`);
        return response.data.data;
    } catch (error) {
        console.error("Failed to fetch logs", error);
        toast.error("Failed to fetch equipment logs");
        return [];
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
    fetchCategories();
    fetchBookings();
    fetchBundles();
    fetchPersonalBundles();
    fetchDrafts();
  }, [fetchEquipment, fetchCategories, fetchBookings, fetchBundles, fetchPersonalBundles, fetchDrafts]);

  useEffect(() => {
    localStorage.setItem('isAdmin', state.isAdmin);
  }, [state.isAdmin]);

  return (
    <InventoryContext.Provider value={{ 
        ...state,
        user, 
        addEquipment, 
        updateEquipment, 
        updateLocalEquipment,
        deleteEquipment,
        checkOutEquipment, 
        batchCheckIn, 
        cancelBooking,
        batchCancel,
        updateBooking,
        replaceBooking,
        reportProblem, 
        toggleAdmin,
        addStockTake,
        fetchBundles,
        fetchPersonalBundles,
        fetchDrafts,
        savePersonalBundle,
        saveDraft,
        deleteDraft,
        fetchEquipmentLogs,
        fetchBookings,
        fetchEquipment,
        fetchCategories
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => useContext(InventoryContext);
