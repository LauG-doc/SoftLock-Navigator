export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export async function fetchApi(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`API Fetch Error (${endpoint}):`, error)
    throw error
  }
}

// Readiness Endpoints
export const getDashboardSummary = () => fetchApi('/dashboard/summary')
export const getSubjects = (status) => fetchApi(`/subjects${status && status !== 'all' ? `?status=${status}` : ''}`)
export const getSubjectDetail = (subjectId) => fetchApi(`/subjects/${subjectId}`)
export const getSites = () => fetchApi('/sites')

// Data Quality & Sources
export const getDataQuality = () => fetchApi('/data-quality')
export const getValidationSummary = () => fetchApi('/validation')
export const getSources = () => fetchApi('/sources')

// Upload Endpoints
export const getRequiredFiles = () => fetchApi('/upload/required-files')

export const processUpload = async (files) => {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })

  return fetchApi('/upload/process', {
    method: 'POST',
    body: formData,
    // Do not set Content-Type header; browser automatically sets it with boundary for FormData
  })
}
