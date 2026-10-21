import { Request } from 'express'
import formidable, { File } from 'formidable'
import fs from 'fs'
import path from 'path'
import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
// file system: tạo | xoá | thêm thư mục

// chứa các functions xử lý file
// tạo hàm tự tạo folder upload
export const initFolder = () => {
  ;[UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

export const handleUploadSingleImage = (req: Request) => {
  const form = formidable({
    uploadDir: path.resolve(UPLOAD_IMAGE_TEMP_DIR),
    keepExtensions: true, //giữ lại đuôi file đc gửi lên
    maxFiles: 1,
    maxFileSize: 300 * 1024,
    filter: function ({ name, originalFilename, mimetype }) {
      //name là trường dữ liệu được gọi từ form
      //originalFilename tên gốc của file
      //mimeType: loại type của file
      const valid = name === 'image' && Boolean(mimetype?.includes('image/'))
      if (!valid) form.emit('error' as any, new Error('Not file type') as any)
      return valid
    }
  })

  //parse dữ liệu từ from của req do client gửi lên
  //đặc trưng của callback là không sync, chạy bất đồng bộ
  return new Promise<File>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }

      //nếu không có lỗi do quá trình parse
      if (!files.image) {
        return reject(new Error('Image is empty'))
      }

      //nếu mã có gửi và đầy đủ thì
      resolve((files.image as File[])[0])
    })
  })
}

export const getNameFromFullname = (filename: string) => {
  const nameArr = filename.split('.')
  return nameArr.pop()
}
