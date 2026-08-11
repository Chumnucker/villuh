import app from './app.js'

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
