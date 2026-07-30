require('dotenv').config()
const app = require('./app')

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`Kings Highway Dental Laboratory pickup backend running on port ${PORT}`)
})
