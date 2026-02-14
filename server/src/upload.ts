import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../data/uploads')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${unique}${ext}`)
  },
})

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('INVALID_TYPE'))
  }
}

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
})

export { UPLOADS_DIR }
