/**
 * Attaches a mock interceptor to the apiClient if running in DEV mode.
 * This replaces the inline mock logic previously found in contexts/components.
 */
export const setupMockInterceptor = (apiClient) => {
  if (!import.meta.env.DEV) return;

  apiClient.interceptors.request.use((config) => {
    // We can intercept requests here and return mock responses by rejecting with a special mock error,
    // or by adapting an axios-mock-adapter. Since we want to keep it simple and native:
    // For now, we will let requests pass through to the real backend running locally,
    // as the backend is fully functional. 
    // If true offline mock is needed, implement axios-mock-adapter here.
    return config;
  });
};
