const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()

const port = process.env.PORT || 9000
const app = express()

app.use(cors())
app.use(express.json())

// conceptual-11
// DTOL33v8Ng9J675N

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

    // save a job data in db
    app.post('/add-job', async(req,res)=>{
      const jobData = req.body;
      const result = await jobCollection.insertOne(jobData)
      res.send(result)
      console.log(result)
    })

    // get all data from db
    app.get('/jobs', async(req,res)=>{
      const result = await jobCollection.find().toArray();
      res.send(result); 
    })

    // get all jobs posted by a specific user
    app.get('/jobs/:email',async(req,res)=>{
      const email = req.params.email;
      const query = {'buyer.email': email};
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    })

    // delete a job from db
    app.delete('/job/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await jobCollection.deleteOne(query);
      res.send(result)
    })

    // get a single job from db
    app.get('/job/:id',async(req,res)=>{
      const id = req.params.id;
      console.log(id)
      const query = {_id: new ObjectId(id)};
      const result = await jobCollection.findOne(query);
      res.send(result);
    })

    // update data 
    app.put('/update-job/:id', async(req,res)=>{
      const id = req.params.id;
      const jobData = req.body;
      const updated = {
        $set:
          jobData, 
      }
      const query = {_id: new ObjectId(id)};
      const options = {upsert: true};
      const result = await jobCollection.updateOne(query,updated,options);
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
