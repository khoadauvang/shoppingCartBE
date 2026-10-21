import { Request } from 'express'
import sharp from 'sharp'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { getNameFromFullname, handleUploadSingleImage } from '~/utils/file'
import fs from 'fs'

class MediasServices {
  async uploadSingleImage(req: Request) {
    const file = await handleUploadSingleImage(req)
    file.newFilename = getNameFromFullname(file.newFilename) + '.jpg'

    //tạo dường dẫn mà mình sẽ lưu file
    const newPath = UPLOAD_IMAGE_DIR + '/' + file.newFilename

    //sharp | file.filepath: là đường dẫn lưu trữ trong temp
    await sharp(file.filepath as string)
      .jpeg()
      .toFile(newPath)

    //xoá
    fs.unlinkSync(file.filepath)
    //   ưu vào folder chính thức
    // trả ra link để người dùng xài
    return `http://localhost:3000/static/image/${file.newFilename}`
  }
}

const mediasServices = new MediasServices()
export default mediasServices
