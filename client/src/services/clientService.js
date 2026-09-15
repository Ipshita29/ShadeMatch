import api from './api'

function extractErrorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message
  if (error.request) return 'Could not reach the server. Please check your connection and try again.'
  return 'Something went wrong. Please try again.'
}

// Uploads a client photo and resolves with { url, publicId } from Cloudinary.
export async function uploadClientPhoto(file) {
  const formData = new FormData()
  formData.append('photo', file)

  try {
    const { data } = await api.post('/clients/upload-photo', formData)
    return data.data
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error })
  }
}

// Creates the client record that Part 4 attaches a skin-region analysis to.
export async function createClient({ name, photoUrl, photoPublicId }) {
  try {
    const { data } = await api.post('/clients', { name, photoUrl, photoPublicId })
    return data.data
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error })
  }
}

// Triggers Part 4 face detection + skin-region extraction for a client and
// resolves with the raw analysis result (regions, representative color,
// quality flags). Does not yet produce a classified skin profile — that's
// Part 5.
export async function analyzeSkinRegions(clientId) {
  try {
    const { data } = await api.post(`/clients/${clientId}/analyze-skin-regions`)
    return data.data
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error })
  }
}
