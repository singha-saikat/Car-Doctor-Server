const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookie_parser = require('cookie-parser')
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookie_parser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ggrwjrl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares
const logger = async(req,res,next) => {
  console.log('called', req.host,req.originalUrl)
  next();
}
const verifyToken = async (req,res,next)=>{
  const token = req.cookies?.token;
  if(!token){
    return res.status(401).send({massage:'unauthorized access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decode)=>{
    if(err){
      return res.status(401).send({massage:'unauthorized access'})
    }
    req.user = decode;
    // console.log(decode);
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingsCollection = client.db("carDoctor").collection("booking");

    // app.post('/jwt',logger,async(req,res) => {
    //   const user = req.body;
    //   console.log(user);
    //   const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{ expiresIn:'1h'})
    //   res
    //   .cookie('token',token,{
    //     httpOnly:true,
    //     secure:false,
    //     sameSite:true,
    //   })
    //   .send({success: true});

    // })

    // auth api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post('/logout',async(req,res) => {
      const user = req.body;
      // console.log('logging out',user);
      res.clearCookie('token', { maxAge: 0 }).send({success:true})
    })

    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };

      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    app.get("/bookings",logger,verifyToken, async (req, res) => {
      // console.log("token", req.cookies.token);
      console.log('user info:',req.user);
      console.log('cookies mail', req.query.email);
      if(req.user.email !== req.query.email){
        return res.status(403).send({massage:'unauthorized access'})
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingsCollection.find(query).toArray();
      // console.log(result);
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car-doctor-application is running");
});

app.listen(port, () => {
  console.log(`Car doctor server is running on port ${port}`);
});
