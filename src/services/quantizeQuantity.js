// Ajusta quantidade de acordo com stepSize
export function quantizeQuantity(amount, stepSize) {
  const decimals = (stepSize.toString().split('.')[1] || '').length
  return parseFloat(Math.floor(amount * Math.pow(10, decimals)) / Math.pow(10, decimals))
}
