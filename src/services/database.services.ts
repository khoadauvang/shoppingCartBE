import { Collection, Db, MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import User from '~/models/User.schema'
import RefreshToken from '~/models/RefreshToken.schema'
dotenv.config() //kết nối với file .env

// const uri = process.env.DB_URI as string
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.ytvbd0q.mongodb.net/`

export class DatabaseServices {
  private client: MongoClient
  private db: Db

  constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.DB_NAME)
  }

  // const client = new MongoClient(uri, {
  //   serverApi: {
  //     version: ServerApiVersion.v1,
  //     strict: true,
  //     deprecationErrors: true
  //   }
  // })
  async connect() {
    try {
      await this.db.command({ ping: 1 })
      console.log('Successfully connected to MongoDB!')
    } catch (err) {
      console.error(err)
    }
  }
  //method connect đến Collection users
  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USERS_COLLECTION as string)
  }

  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKENS_COLLECTION as string)
  }
}
//dependency injection pattern
const databaseServices = new DatabaseServices()
export default databaseServices
