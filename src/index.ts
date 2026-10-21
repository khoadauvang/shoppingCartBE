import express from 'express'
import userRouter from './routes/users.routes'
import databaseServices from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import mediasRoutes from './routes/medias.routes'
import { initFolder } from './utils/file'
import staticRouter from './routes/static.routes'

const app = express()
const PORT = 3000 //mở cổng BE với PORT 3000

databaseServices.connect()

app.use(express.json()) //một cái bước midlleware cho toàn hệ thống sử dụng json

initFolder()

app.use('/users', userRouter)

app.use('/medias', mediasRoutes)

app.use('/static', staticRouter)

//Error Handler Tổng của toàn bộ app
app.use(defaultErrorHandler)
//cho server mở cổng lắng nghe
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`)
})
