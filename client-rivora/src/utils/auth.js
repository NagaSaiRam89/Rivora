
// export const isTokenExpired = () => {
//   const token = Cookies.get('token') 
//   if (!token) return true

//   try {
//     const [, payloadBase64] = token.split('.')
//     const decodedPayload = JSON.parse(atob(payloadBase64))
//     const currentTime = Math.floor(Date.now() / 1000) 

//     return decodedPayload.exp < currentTime
//   } catch (err) {
//     console.error('Invalid token:', err)
//     return true 
//   }
// }
