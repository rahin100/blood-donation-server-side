const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// connect to MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uv8wjkw.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const userCollection = client.db("blood-donation").collection("users");
    const allDistrictsCollection = client
      .db("blood-donation")
      .collection("all_districts");
    const allZillaCollection = client.db("blood-donation").collection("zilla");

    const donationRequestCollection = client
      .db("blood-donation")
      .collection("donation-request");

    //donation request collection
    app.post("/dashboard/donation-request", async (req, res) => {
      const user = req.body;
      const result = await donationRequestCollection.insertOne(user);
      res.send(result);
    });

    app.get("/dashboard/donation-request", async (req, res) => {
      const query = req.query;
      const cursor = donationRequestCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/dashboard/donation-request", async (req, res) => {
      let query = {};
      if (req.query?.requesterEmail) {
        query = {
          requesterEmail: req.query?.requesterEmail,
        };
      }
      const cursor = donationRequestCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //get districts
    app.get("/all_districts", async (req, res) => {
      const query = req.query;
      const cursor = allDistrictsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //get upazillas
    app.get("/zilla", async (req, res) => {
      const query = req.query;
      const cursor = allZillaCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // user collection
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get user
    app.get("/users", async (req, res) => {
      const query = req.query;
      const cursor = userCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // profile route
    app.get("/profile", async (req, res) => {
      const { email } = req.query;
      const query = { email: email };

      try {
        const result = await userCollection.findOne(query);

        if (result) {
          res.json(result);
        } else {
          res.status(404).json({ error: "User not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // user update
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateInfo = req.body;
      console.log(updateInfo);

      const updateData = {
        $set: {
          name: updateInfo.name,
          photo: updateInfo.photo,
          email: updateInfo.email,
          bloodGroup: updateInfo.bloodGroup,
          district: updateInfo.district,
          upazila: updateInfo.upazila,
        },
      };

      const result = await userCollection.updateOne(
        filter,
        updateData,
        options
      );
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // close the client when finished/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("blood-donation is running");
});

app.listen(port, () => {
  console.log(`blood-donation server is running on port ${port}`);
});
