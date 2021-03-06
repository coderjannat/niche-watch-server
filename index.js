const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;

const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u4cly.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, });


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('watch');
        // const appointmentsCollection = database.collection('appointments');
        const watchCollection = database.collection('watchCollection');
        const orderCollection = database.collection('order');
        const reviewCollection = database.collection('review');
        const usersCollection = database.collection('users');
// watch
app.post("/addwatch", async (req, res) => {
    const result = await watchCollection.insertOne(req.body);
    res.send(result);
  });

        
        app.get('/watchCollection', async (req, res) => {
           const cursor = watchCollection.find({});
           const result = await cursor.toArray();
           res.send(result);
        })
        

        //  showing specific watch by id

        app.get('/watchCollection/:id', async (req, res) => {
            console.log(req.body);
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await watchCollection.findOne(query);
            res.json(result);

        })

        // plceorder 
        app.post("/order", async (req, res) => {

            const result = await orderCollection.insertOne(req.body);
            res.send(result);
        });
        // get the user order
        app.get('/order', verifyToken, async (req, res) => {
            const email = req.query.email;

            const query = { email: email }

            const cursor = orderCollection.find(query);
            const order = await cursor.toArray();
            res.json(order);
            console.log(order)
        })
        app.get('/totalorder',async (req, res) => {
            const cursor = orderCollection.find({});
           const result = await cursor.toArray();
           res.send(result);
        })
        // delete order

        app.delete("/order", verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
           const result = await orderCollection.deleteOne(query);
            res.send(result);
          });
      
        app.delete("/totaldelete",async (req, res) => {
           
           const result = await orderCollection.deleteOne({});
            res.send(result);
          });
      
          
      // status update
       app.put("/statusUpdate/:id", verifyToken, async (req, res) => {
         const filter = { _id: ObjectId(req.params.id) };
         console.log(req.params.id);
        const result = await orderCollection.updateOne(filter, {
         $set: {
            status: req.body.status,
         },
         });
        res.send(result);
    // console.log(result);
  });
//   REVIEW
app.post("/addReview", async (req, res) => {
    const result = await reviewCollection.insertOne(req.body);
    res.send(result);
  });

  app.get('/totalreview', async (req, res) => {
    const query = {};
    const result = await reviewCollection.find(query).toArray();
    res.json(result);
})


        // user
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });
        // admin
          app.put('/users/admin', verifyToken, async (req, res) => {
              const user = req.body;
              const requester = req.decodedEmail;
              if (requester) {
                  const requesterAccount = await usersCollection.findOne({ email: requester });
                  if (requesterAccount.role === 'admin') {
                      const filter = { email: user.email };
                      const updateDoc = { $set: { role: 'admin' } };
                      const result = await usersCollection.updateOne(filter, updateDoc);
                      res.json(result);
                  }
              }
              else {
                  res.status(403).json({ message: 'you do not have access to make admin' })
              }

          })
    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(process.env.PORT || port);
