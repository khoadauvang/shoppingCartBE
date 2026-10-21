import express from 'express'
import { serveSingleImageController } from '~/controllers/medias.controllers'
import { wrapAsync } from '~/utils/handler'

const staticRouter = express.Router()

//image
staticRouter.get('/image/:filename', wrapAsync(serveSingleImageController))

export default staticRouter
