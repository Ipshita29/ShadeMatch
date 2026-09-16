import api from './api'

function extractErrorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message
  if (error.request) return 'Could not reach the server. Please check your connection and try again.'
  return 'Something went wrong. Please try again.'
}

async function get(path, params) {
  try {
    const { data } = await api.get(path, { params })
    return data
  } catch (error) {
    throw new Error(extractErrorMessage(error), { cause: error })
  }
}

// Product-level overview (brand + product cards) for the library landing view.
export async function getFoundations(params) {
  const { data } = await get('/foundations', params)
  return data
}

export async function getBrands() {
  const { data } = await get('/foundations/brands')
  return data
}

export async function getBrandById(brandId) {
  const { data } = await get(`/foundations/brands/${brandId}`)
  return data
}

export async function getProductById(productId) {
  const { data } = await get(`/foundations/products/${productId}`)
  return data
}

// { brand, product, undertone, depth, page, limit } — all optional.
export async function getShades(params) {
  const response = await get('/foundations/shades', params)
  return response // { data, pagination }
}

export async function getShadeById(shadeId) {
  const { data } = await get(`/foundations/shades/${shadeId}`)
  return data
}

// { q, brand, undertone, depth, page, limit }
export async function searchShades(params) {
  const response = await get('/foundations/search', params)
  return response // { data, pagination }
}
