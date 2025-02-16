const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 9000
const app = express()
const cookieParser = require('cookie-parser')

const corsOptions = {
  origin: ['http://localhost:5173'],
  credentials: true,
  optionalSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9njqe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
    const db = client.db('solo-db')
    const jobCollection = db.collection('jobs')
    const bidCollection = db.collection('bids')

    // generate jwt token
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      // create token
      const token = jwt.sign(email, process.env.SECRET_TOKEN, { expiresIn: '365d' })
      console.log(token)
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
        })
        .send({ success: true })
    })

    // clear token
    app.get('/logout', async (req, res) => {
      res
        .clearCookie('token', {
          maxAge: 0,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
        })
        .send({ success: true })
    })

    // verify token
    const verifyToken = (req, res, next) => {
      const token = req.cookies?.token
      if (!token) return res.status(401).send({ message: 'unauthorized access' })
      jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded
      })
      next()
    }

    // save a job data in db
    app.post('/add-job', async (req, res) => {
      const jobData = req.body;
      const result = await jobCollection.insertOne(jobData)
      res.send(result)
      // console.log(result)
    })

    // get all data from db
    app.get('/jobs', async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    })

    // get all jobs posted by a specific user
    app.get('/jobs/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'buyer.email': email };
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    })

    // delete a job from db
    app.delete('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result)
    })

    // get a single job from db
    app.get('/job/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    })

    // update data 
    app.put('/update-job/:id', async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const updated = {
        $set:
          jobData,
      }
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await jobCollection.updateOne(query, updated, options);
      res.send(result);
    })

    // save a bid data in db
    app.post('/add-bid', async (req, res) => {
      const bidData = req.body;

      const query = { email: bidData.email, jobId: bidData.jobId };
      const alreadyExist = await bidCollection.findOne(query);
      console.log(alreadyExist)
      if (alreadyExist)


        return res
          .status(400)
          .send('you have already bid')

      const result = await bidCollection.insertOne(bidData);

      const filter = { _id: new ObjectId(bidData.jobId) };
      const update = {
        $inc: { bid_count: 1 }
      }
      const updateBidCount = await jobCollection.updateOne(filter, update);
      res.send(result)
      // console.log(result)
    })

    // get all bids requests
    app.get('/bids/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    })
    // get all bids requests
    app.get('/bid-requests/:email', verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email;
      const email = req.params.email;
      const query = { buyer: email };

      // console.log('from token', decodedEmail)

      if (decodedEmail !== email)
        return res.status(401).send({ message: 'unauthorized access' })

        const result = await bidCollection.find(query).toArray();
      res.send(result);
    })

    app.patch('/bid-update/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: { status }
      }
      const result = await bidCollection.updateOne(filter, update);
      res.send(result);
    })

    // get all fobs
    app.get('/all-jobs', async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      let options = {}
      if (sort) options = { sort: { deadline: sort === 'asc' ? 1 : -1 } }
      let query = {
        title: {
          $regex: search,
          $options: 'i'
        }
      };
      if (filter) query.category = filter
      const result = await jobCollection.find(query, options).toArray();
      res.send(result);
    })

  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
