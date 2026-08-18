import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
});

export const getSignalStatus = async (intersectionId = 'junction_1') => {
  const res = await api.get(`/signals/status/${intersectionId}`);
  return res.data;
};

export const getTrafficHistory = async (intersectionId = 'junction_1', limit = 30) => {
  const res = await api.get(`/traffic/history?intersection=${intersectionId}&limit=${limit}`);
  return res.data;
};

export const getAnalyticsSummary = async (intersection = 'junction_1') => {
  try {
    const res = await api.get(`/analytics/summary`, { params: { intersection } });
    return res.data;
  } catch (error) {
    console.error("Error fetching analytics summary:", error);
    return null;
  }
};

export const getVehicleHistory = async (params = {}) => {
  try {
    const res = await api.get(`/vehicles/history`, { 
      params: {
        intersection: params.intersection || 'junction_1',
        limit: params.limit || 50,
        vehicle_type: params.vehicleType || params.vehicle_type || 'All',
        lane: params.lane || 'All',
        camera: params.camera || 'All',
        direction: params.direction || 'All',
        source: params.source || 'All'
      } 
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching vehicle history:", error);
    return [];
  }
};

export const getVehicleTaxonomy = async () => {
  try {
    const res = await api.get(`/vehicles/taxonomy`);
    return res.data;
  } catch (error) {
    console.error("Error fetching vehicle taxonomy:", error);
    return [];
  }
};

export const getVehicleStats = async (intersection = 'junction_1') => {
  try {
    const res = await api.get(`/vehicles/stats`, { params: { intersection } });
    return res.data;
  } catch (error) {
    console.error("Error fetching vehicle stats:", error);
    return null;
  }
};

export const getSystemMode = async () => {
  try {
    const res = await api.get(`/system/mode`);
    return res.data;
  } catch (error) {
    console.error("Error fetching system mode:", error);
    return { data_mode: "recorded_video", active_sources: {} };
  }
};

export const setSystemMode = async (dataMode) => {
  try {
    const res = await api.post(`/system/mode`, { data_mode: dataMode });
    return res.data;
  } catch (error) {
    console.error("Error setting system mode:", error);
    return null;
  }
};

export const getViolations = async (filters = {}) => {
  try {
    const res = await api.get(`/violations`, { params: filters });
    return res.data;
  } catch (error) {
    console.error("Error fetching violations:", error);
    return [];
  }
};

export const triggerSignalUpdate = async (intersectionId = 'junction_1') => {
  const res = await api.post(`/signals/update?intersection=${intersectionId}`);
  return res.data;
};

export const postSimulatedTraffic = async (l1, l2, l3, l4, intersectionId = 'junction_1') => {
  const res = await api.post(`/traffic/analyze`, {
    intersection: intersectionId,
    lane_1: l1,
    lane_2: l2,
    lane_3: l3,
    lane_4: l4
  });
  return res.data;
};

export const overrideSignal = async (targetLane = 'lane_1', intersectionId = 'junction_1') => {
  const res = await api.post(`/signals/override?target_lane=${targetLane}&intersection=${intersectionId}&green_time=60`);
  return res.data;
};

export default api;
