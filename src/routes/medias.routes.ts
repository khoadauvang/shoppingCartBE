import express from 'express'
import { uploadSingleImageController } from '~/controllers/medias.controllers'
import { wrapAsync } from '~/utils/handler'

const mediasRoutes = express.Router()

/*upload-image (single image)
des: người dùng gửi form có chứa hình ảnh lên server
server lưu trữ hình ảnh trên vào hệ thống
path: /medias/upload-image
method: POST
*/
mediasRoutes.post('/upload-image', wrapAsync(uploadSingleImageController))

export default mediasRoutes
