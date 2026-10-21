import { Request, Response } from 'express'
import formidable from 'formidable'
import path from 'path'
import HTTP_STATUS from '~/constants/httpStatus'
import mediasServices from '~/services/medias.services'
import { handleUploadSingleImage } from '~/utils/file'
import fs from 'fs'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'

export const uploadSingleImageController = async (req: Request, res: Response) => {
  //tiếp nhận file từ req, kiểm tra formidable và lưu tạm
  const file = await mediasServices.uploadSingleImage(req)
  return res.status(HTTP_STATUS.OK).json({
    message: 'Upload image success',
    result: file
  })
}

export const serveSingleImageController = async (req: Request, res: Response) => {
  const { filename } = req.params
  return res.sendFile(path.resolve(UPLOAD_IMAGE_DIR, filename), (err) => {
    if (err) {
      return res.status((err as any).status || 500).json({
        message: 'File not found'
      })
    }
  })
}
