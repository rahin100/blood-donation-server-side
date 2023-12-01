const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

// middleware
const verifyToken = async (req, res, next) => {
  console.log("inside the verify token", req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    console.log(token);
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

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
    const allBlogsCollection = client
      .db("blood-donation")
      .collection("all-blogs");
    const paymentCollection = client.db("blood-donation").collection("payment");

    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("I need a new jwt", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true, token });
    });

    // blogs collection
    app.post("/dashboard/all-blogs", async (req, res) => {
      const user = req.body;
      const result = await allBlogsCollection.insertOne(user);
      res.send(result);
    });

    app.get("/dashboard/all-blogs", async (req, res) => {
      const query = req.query;
      const cursor = allBlogsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //publish
    app.patch("/dashboard/all-blogs/:id", async (req, res) => {
      const id = req.params.id;
      const { blog_status } = req.body;
      const filter = { _id: new ObjectId(id) };
      console.log(blog_status);

      const updateStatus = {
        $set: {
          blog_status: blog_status,
        },
      };

      const result = await allBlogsCollection.updateOne(filter, updateStatus);
      res.send(result);
    });
    //Unpublish
    app.patch("/dashboard/all-blogs/:id", async (req, res) => {
      const id = req.params.id;
      const { blog_status } = req.body;
      const filter = { _id: new ObjectId(id) };
      console.log(blog_status);

      const updateStatus = {
        $set: {
          blog_status: blog_status,
        },
      };

      const result = await allBlogsCollection.updateOne(filter, updateStatus);
      res.send(result);
    });
    // update blog
    app.put("/dashboard/all-blogs/:id", async (req, res) => {
      const id = req.params.id;
      const updateBlog = req.body.updateBlog;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      console.log(updateBlog);

      const updateData = {
        $set: {
          title: updateBlog.title,
          photo: updateBlog.photo,
          content: updateBlog.content,
          blog_status: "draft",
        },
      };

      try {
        const result = await allBlogsCollection.updateOne(
          filter,
          updateData,
          options
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating donation:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.delete("/dashboard/all-blogs/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = {
        _id: new ObjectId(id),
      };
      const result = await allBlogsCollection.deleteOne(query);
      res.send(result);
    });

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

    app.patch("/dashboard/donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const { donationStatus, donorName, donorEmail } = req.body;
      const filter = { _id: new ObjectId(id) };
      console.log(donationStatus);

      const updateStatus = {
        $set: {
          donationStatus: donationStatus,
          donorName: donorName,
          donorEmail: donorEmail,
        },
      };

      const result = await donationRequestCollection.updateOne(
        filter,
        updateStatus
      );
      res.send(result);
    });

    app.put("/dashboard/donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const updateDonation = req.body.donationRequestData;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateDonations = {
        $set: {
          requesterName: updateDonation.requesterName,
          requesterEmail: updateDonation.requesterEmail,
          recipientName: updateDonation.recipientName,
          recipientDistrict: updateDonation.recipientDistrict,
          recipientUpazila: updateDonation.recipientUpazila,
          recipentBloodGroup: updateDonation.recipentBloodGroup,
          hospitalName: updateDonation.hospitalName,
          fullAddress: updateDonation.fullAddress,
          donationDate: updateDonation.donationDate,
          donationTime: updateDonation.donationTime,
          requestMessage: updateDonation.requestMessage,
          donationStatus: "pending",
        },
      };

      try {
        const result = await donationRequestCollection.updateOne(
          filter,
          updateDonations,
          options
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating donation:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.delete("/dashboard/donation-request/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = {
        _id: new ObjectId(id),
      };
      const result = await donationRequestCollection.deleteOne(query);
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

    // admin related crud

    // blocked
    app.patch("/dashboard/all-users/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      console.log(status);

      const updateStatus = {
        $set: {
          status: status,
        },
      };

      const result = await userCollection.updateOne(filter, updateStatus);
      res.send(result);
    });

    // Active
    app.patch("/dashboard/all-users/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      console.log(status);

      const updateStatus = {
        $set: {
          status: status,
        },
      };

      const result = await userCollection.updateOne(filter, updateStatus);
      res.send(result);
    });

    //Make Volunteer
    app.put("/dashboard/all-users/:id", async (req, res) => {
      const id = req.params.id;
      const { Role } = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      console.log(Role);

      const updateRole = {
        $set: {
          Role: Role,
        },
      };

      const result = await userCollection.updateOne(
        filter,
        updateRole,
        options
      );
      res.send(result);
    });

    //Make Donor to Admin
    app.put("/dashboard/all-users/:id", async (req, res) => {
      const id = req.params.id;
      const { Role } = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      console.log(Role);

      const updateRole = {
        $set: {
          Role: Role,
        },
      };

      const result = await userCollection.updateOne(
        filter,
        updateRole,
        options
      );
      res.send(result);
    });

    //Make Volunteer to Admin
    app.put("/dashboard/all-users/:id", async (req, res) => {
      const id = req.params.id;
      const { Role } = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      console.log(Role);

      const updateRole = {
        $set: {
          Role: Role,
        },
      };

      const result = await userCollection.updateOne(
        filter,
        updateRole,
        options
      );
      res.send(result);
    });

    app.get("/users/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;

        const query = { email: email };
        const user = await userCollection.findOne(query);
        const admin = user?.Role === "Admin";

        res.send({ admin });
      } catch (error) {
        console.error("Error in /users/:email route:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // volunteer related crud
    app.get("/users/volunteer/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;

        const query = { email: email };
        const user = await userCollection.findOne(query);
        const volunteer = user?.Role === "Volunteer";

        res.send({ volunteer });
      } catch (error) {
        console.error("Error in /users/:email route:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    //payment intent
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;

        const amount = parseInt(price * 100);

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating Payment Intent:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // ... (your imports)

    app.post("/payment", async (req, res) => {
      try {
        const paymentData = req.body;
        const result = await paymentCollection.insertOne(paymentData);
        res.send(result);
      } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/payment", async (req, res) => {
      const query = req.query;
      const cursor = paymentCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/payment", async (req, res) => {
      const { email } = req.query;
      const query = { email: email };

      try {
        const result = await paymentCollection.findOne(query);

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
