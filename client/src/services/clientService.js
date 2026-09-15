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

// Creates the client record that Part 4 will attach a skin profile to.
export async function createClient({ name, photoUrl, photoPublicId }) {
  try {
    const { data } = await api.post('/clients', { name, photoUrl, photoPublicId })
    return data.data
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error })
  }
}
